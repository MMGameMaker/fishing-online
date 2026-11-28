import type { CommunityStats } from './types';

const percent = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : '—');

/**
 * Bảng thống kê cộng đồng Facebook (chỉ hiển thị; host tự gọi GET {prefix}/admin/community/stats rồi đưa dữ liệu vào).
 * Số liệu là lượt bấm/xác nhận trong game: "đã vào nhóm" là nhập đúng mã ghim trong nhóm, "chia sẻ" là lượt bấm nút chia sẻ.
 * Không đọc được react hay bài viết thật trong nhóm vì Meta đã gỡ Groups API (22/4/2024).
 */
export function CommunityStatsView({ data, onReload }: { data: CommunityStats; onReload?: () => void }) {
  return (
    <>
      <table>
        <tbody>
          <tr><th>Người chơi</th><td>{data.players}</td></tr>
          <tr><th>Tài khoản Google / Facebook</th><td>{data.googleAccounts} / {data.facebookAccounts}</td></tr>
          <tr><th>Có ảnh tài khoản</th><td>{data.withAvatar} ({percent(data.withAvatar, data.players)})</td></tr>
          <tr><th>Đã bấm vào nhóm</th><td>{data.joinLinkClickers} ({percent(data.joinLinkClickers, data.players)})</td></tr>
          <tr><th>Đã xác nhận vào nhóm (nhập đúng mã)</th><td>{data.groupVerified} ({percent(data.groupVerified, data.players)})</td></tr>
          <tr><th>Lượt bấm chia sẻ lên trang cá nhân</th><td>{data.shares.feed}</td></tr>
          <tr><th>Lượt bấm chia sẻ vào nhóm</th><td>{data.shares.group}</td></tr>
          <tr><th>Số người đã bấm chia sẻ</th><td>{data.sharers} ({percent(data.sharers, data.players)})</td></tr>
        </tbody>
      </table>
      <h3>7 ngày gần nhất (lượt bấm chia sẻ)</h3>
      <table>
        <thead>
          <tr><th>Ngày (UTC)</th><th>Trang cá nhân</th><th>Nhóm</th></tr>
        </thead>
        <tbody>
          {data.last7Days.map((day) => (
            <tr key={day.date}><td>{day.date}</td><td>{day.feed}</td><td>{day.group}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        Không có số react hay số bài thật được đăng vào nhóm: Meta đã gỡ Groups API nên không đọc được. Số trên đếm lượt bấm trong game.
      </p>
      {onReload && <button onClick={onReload}>Tải lại</button>}
    </>
  );
}
