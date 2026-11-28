import { CommunityStatsView, type CommunityStats } from '@social-kit-admin';
import { api } from '../api';
import { Status, useLoad } from '../ui';

/** Trang Cộng đồng Facebook: gọi API admin của game rồi dùng bảng của SocialKit (social-kit/admin). */
export function CommunityPage() {
  const stats = useLoad(() => api<CommunityStats>('GET', '/api/v1/admin/community/stats'), []);
  const data = stats.data;
  return (
    <section>
      <h2>Cộng đồng Facebook</h2>
      <Status loading={stats.loading && !data} error={stats.error}>
        {data && <CommunityStatsView data={data} onReload={() => void stats.reload()} />}
      </Status>
    </section>
  );
}
