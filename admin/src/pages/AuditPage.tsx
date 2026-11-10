import { formatTime } from '../time';
import type { AuditRow } from '../types';
import { JsonCell, Status, usePaged } from '../ui';

export function AuditTable({ path }: { path: string }) {
  const page = usePaged<AuditRow>(path);
  return (
    <Status loading={page.loading && page.items.length === 0} error={page.error} empty={!page.loading && page.items.length === 0}>
      <table>
        <thead>
          <tr>
            <th>Lúc</th>
            <th>Người làm</th>
            <th>Thao tác</th>
            <th>Đối tượng</th>
            <th>Trước</th>
            <th>Sau</th>
          </tr>
        </thead>
        <tbody>
          {page.items.map((row) => (
            <tr key={row.id}>
              <td>{formatTime(row.at)}</td>
              <td>{row.actor}</td>
              <td>{row.action}</td>
              <td>{row.target}</td>
              <td>
                <JsonCell value={row.beforeJson} />
              </td>
              <td>
                <JsonCell value={row.afterJson} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {page.hasMore && <button onClick={() => void page.loadMore()}>Tải thêm</button>}
    </Status>
  );
}

export function AuditPage() {
  return (
    <section>
      <h2>Audit</h2>
      <AuditTable path="/api/v1/admin/audit" />
    </section>
  );
}
