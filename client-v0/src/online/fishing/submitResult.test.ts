import { describe, expect, it, vi } from 'vitest';
import samples from '@fixtures/api-samples.v0.json';
import type { AttemptView, CommandAck } from '../net/contract';
import { submitFishingResult, type SubmitInvoke } from './submitResult';

const okAck = samples.hub['SubmitFishingResult ack'] as unknown as CommandAck<{
  attempt: AttemptView;
}>;
const options = { uuid: () => 'req-1', sleep: () => Promise.resolve() };

describe('submitFishingResult', () => {
  it('trả kết quả đã ghi của Server, không tự tính thưởng', async () => {
    const invoke = vi.fn<SubmitInvoke>(async () => okAck);
    const result = await submitFishingResult(invoke, 'a-1', 'success', options);
    expect(result).toEqual({ kind: 'settled', attempt: okAck.data?.attempt });
    expect(invoke).toHaveBeenCalledExactlyOnceWith(
      { attemptId: 'a-1', outcome: 'success' },
      'req-1',
    );
  });

  it('mất response thì gửi lại cùng requestId và outcome', async () => {
    const invoke = vi
      .fn<SubmitInvoke>()
      .mockRejectedValueOnce(new Error('mất mạng'))
      .mockRejectedValueOnce(new Error('mất mạng'))
      .mockResolvedValueOnce(okAck);
    const result = await submitFishingResult(invoke, 'a-1', 'success', options);
    expect(result.kind).toBe('settled');
    expect(invoke.mock.calls.map((c) => c[1])).toEqual(['req-1', 'req-1', 'req-1']);
    expect(invoke.mock.calls.every((c) => c[0].outcome === 'success')).toBe(true);
  });

  it('Server từ chối thì dừng, không gửi lại', async () => {
    const invoke = vi.fn<SubmitInvoke>(async () => ({
      requestId: 'req-1',
      ok: false,
      error: { code: 'RESULT_EXPIRED', message: 'x' },
      data: null,
    }));
    const result = await submitFishingResult(invoke, 'a-1', 'success', options);
    expect(result).toEqual({ kind: 'rejected', code: 'RESULT_EXPIRED' });
    expect(invoke).toHaveBeenCalledOnce();
  });

  it('hết lượt gửi trả unknown để tra snapshot', async () => {
    const invoke = vi.fn<SubmitInvoke>(async () => {
      throw new Error('mất mạng');
    });
    await expect(submitFishingResult(invoke, 'a-1', 'failed', options)).resolves.toEqual({
      kind: 'unknown',
    });
    expect(invoke).toHaveBeenCalledTimes(3);
  });
});
