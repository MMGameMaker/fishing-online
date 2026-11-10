import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api';
import { StockingPage, totals } from './StockingPage';

const api = vi.hoisted(() => vi.fn());
vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), api }));

const batch = {
  batchId: 'b0000001-0000-0000-0000-000000000000',
  lakeId: 'lake-01',
  status: 'draft',
  scheduledAt: null,
  timeZone: 'Asia/Ho_Chi_Minh',
  note: null,
  lines: [
    { speciesId: 'koi', quantity: 20 },
    { speciesId: 'minnow', quantity: 100 },
  ],
  speciesCount: 2,
  totalFish: 120,
  revision: 1,
  createdBy: 'ops@example.com',
  createdAt: '2026-11-10T00:00:00Z',
  updatedBy: 'ops@example.com',
  updatedAt: '2026-11-10T00:00:00Z',
  executedAt: null,
  executedBy: null,
  error: null,
};

const page = (overrides: Partial<Parameters<typeof StockingPage>[0]> = {}) => (
  <StockingPage canWrite canExecute canAudit={false} canSeeLake={false} {...overrides} />
);

describe('StockingPage', () => {
  beforeEach(() => {
    api.mockReset();
    api.mockImplementation(async (method: string, path: string) => {
      if (path === '/api/v1/catalog')
        return { fish: [{ speciesId: 'minnow', name: 'Minnow', rarity: 'common' }, { speciesId: 'koi', name: 'Koi', rarity: 'epic' }] };
      if (method === 'GET') return { items: [batch], nextCursor: null };
      if (path.endsWith('/execute-now')) return { ...batch, status: 'completed', revision: 2, executedBy: 'ops@example.com', executedAt: '2026-11-10T00:01:00Z' };
      return batch;
    });
  });

  it('counts species and fish from the form lines', () => {
    expect(totals([{ speciesId: 'minnow', quantity: '100' }, { speciesId: 'koi', quantity: '20' }, { speciesId: '', quantity: '5' }])).toEqual({
      species: 2,
      fish: 120,
    });
  });

  it('reuses the idempotency key when the create request is retried', async () => {
    api.mockImplementationOnce(async () => ({ items: [], nextCursor: null }));
    render(page());
    await screen.findByText('Minnow (common)');
    fireEvent.change(screen.getByLabelText('Loài 1'), { target: { value: 'minnow' } });
    fireEvent.change(screen.getByLabelText('Số lượng 1'), { target: { value: '100' } });
    expect(screen.getByText(/loài,/).textContent).toContain('1 loài, 100 con');

    api.mockImplementationOnce(async () => {
      throw new ApiError(0, 'NETWORK_ERROR', 'offline');
    });
    fireEvent.click(screen.getByText('Tạo đợt (nháp)'));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByText('Tạo đợt (nháp)'));
    await screen.findByText(/Đợt b0000001/);

    const creates = api.mock.calls.filter(([method, path]) => method === 'POST' && path === '/api/v1/admin/stocking');
    expect(creates).toHaveLength(2);
    expect(creates[0]?.[3]).toEqual(creates[1]?.[3]);
    expect(creates[0]?.[2]).toMatchObject({ lakeId: 'lake-01', lines: [{ speciesId: 'minnow', quantity: 100 }], scheduledAt: null });
  });

  it('executes only after confirmation and sends the expected revision', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(page());
    fireEvent.click(await screen.findByText('draft', { selector: 'td' }));

    fireEvent.click(screen.getByText('Thả ngay'));
    expect(api).not.toHaveBeenCalledWith('POST', expect.stringContaining('execute-now'), expect.anything());
    fireEvent.click(screen.getByText('Thả ngay'));

    expect(await screen.findByText('completed', { selector: 'dd' })).toBeTruthy();
    expect(confirm).toHaveBeenCalledWith('Thả ngay 120 con vào lake-01?');
    expect(api).toHaveBeenCalledWith('POST', `/api/v1/admin/stocking/${batch.batchId}/execute-now`, { expectedRevision: 1 });
  });

  it('hides actions without permissions and shows a denied list', async () => {
    api.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Permission denied'));

    render(page({ canWrite: false, canExecute: false }));

    expect(await screen.findByText('Bạn không có quyền xem mục này.')).toBeTruthy();
    expect(screen.queryByText('Tạo đợt thả')).toBeNull();
  });
});
