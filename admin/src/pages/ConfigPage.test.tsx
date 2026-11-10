import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api';
import { ConfigPage, sectionOf } from './ConfigPage';

const api = vi.hoisted(() => vi.fn());
vi.mock('../api', async (original) => ({ ...(await original<typeof import('../api')>()), api }));

const versions = [{ version: 'v1', isActive: true, publishedAt: '2026-11-09T00:00:00Z', publishedBy: 'system' }];
const draft = (revision: number) => ({
  draftId: 'd1',
  baseVersion: 'v1',
  revision,
  status: 'open',
  publishedVersion: null,
  updatedBy: 'ops',
  updatedAt: '2026-11-10T00:00:00Z',
  document: { configVersion: 'v1', seatTiers: [{ tier: 3, seatNumbers: [11, 20], unitPriceGold: '40' }], fish: [{ speciesId: 'perch', hp: 55 }] },
});

async function openDraft() {
  render(<ConfigPage canWrite canPublish />);
  fireEvent.click(await screen.findByText('Tạo nháp'));
  await screen.findByText(/revision 1/);
}

describe('ConfigPage', () => {
  beforeEach(() => {
    api.mockReset();
    api.mockImplementation(async (method: string, path: string, body?: { expectedRevision?: number }) => {
      if (method === 'GET') return versions;
      if (path.endsWith('/drafts')) return draft(1);
      if (method === 'PUT') return draft((body?.expectedRevision ?? 0) + 1);
      if (path.endsWith('/validate')) return { valid: true, errors: [] };
      return { version: 'v2' };
    });
  });

  it('maps server error paths to sections', () => {
    expect(sectionOf('fish')).toBe('fish');
    expect(sectionOf('$.seatTiers[2].unitPriceGold')).toBe('seatTiers');
  });

  it('saves an edited price, keeps the string type, and publishes only after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await openDraft();

    fireEvent.change(screen.getByLabelText('seatTiers[0].unitPriceGold'), { target: { value: '50' } });
    fireEvent.click(screen.getByText('Lưu nháp'));
    await screen.findByText(/revision 2/);
    expect(api).toHaveBeenCalledWith('PUT', '/api/v1/admin/config/drafts/d1', {
      expectedRevision: 1,
      document: expect.objectContaining({ seatTiers: [{ tier: 3, seatNumbers: [11, 20], unitPriceGold: '50' }] }),
    });

    fireEvent.click(screen.getByText('Kiểm tra'));
    await screen.findByText('Config hợp lệ.');
    fireEvent.click(screen.getByText('Publish'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(api).not.toHaveBeenCalledWith('POST', expect.stringContaining('/publish'), expect.anything());

    fireEvent.click(screen.getByText('Publish'));
    await screen.findByText('Đã publish v2.');
    expect(api).toHaveBeenCalledWith('POST', '/api/v1/admin/config/drafts/d1/publish', { expectedRevision: 2, expectedActiveVersion: 'v1' });
  });

  it('shows validation errors next to their section and blocks publish', async () => {
    api.mockImplementation(async (method: string, path: string) => {
      if (method === 'GET') return versions;
      if (path.endsWith('/validate')) return { valid: false, errors: [{ path: 'fish', message: 'cần 9 loài, có 1.' }] };
      return draft(1);
    });
    await openDraft();

    fireEvent.click(screen.getByText('Kiểm tra'));

    expect(await screen.findByText('fish: cần 9 loài, có 1.')).toBeTruthy();
    expect((screen.getByText('Publish') as HTMLButtonElement).disabled).toBe(true);
  });

  it('explains a 409 when someone else edited the draft', async () => {
    api.mockImplementation(async (method: string) => {
      if (method === 'GET') return versions;
      if (method === 'PUT') throw new ApiError(409, 'STATE_CONFLICT', 'Draft was changed by someone else or is closed.');
      return draft(1);
    });
    await openDraft();

    fireEvent.change(screen.getByLabelText('fish[0].hp'), { target: { value: '60' } });
    fireEvent.click(screen.getByText('Lưu nháp'));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('vừa bị người khác thay đổi'));
  });

  it('shows a denied state without config.read', async () => {
    api.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Permission denied'));

    render(<ConfigPage canWrite={false} canPublish={false} />);

    expect(await screen.findByText('Bạn không có quyền xem mục này.')).toBeTruthy();
  });
});
