import { useState } from 'react';
import { api } from '../api';
import { formatTime } from '../time';
import type { PlayerDetail, PlayerSummary, Signal } from '../types';
import { ErrorBanner, JsonCell, Status, useLoad, usePaged } from '../ui';

type Row = Record<string, unknown>;

const TABS: { key: string; label: string; columns: string[] }[] = [
  { key: 'ledger', label: 'Ledger', columns: ['createdAt', 'reason', 'delta', 'balanceAfter', 'refId'] },
  { key: 'catches', label: 'Cá', columns: ['caughtAt', 'speciesId', 'rarity', 'lengthTenthCm', 'soldAt'] },
  { key: 'attempts', label: 'Lần câu', columns: ['startedAt', 'phase', 'reason', 'speciesId', 'lengthTenthCm', 'endedAt'] },
  { key: 'seat-sessions', label: 'Phiên ghế', columns: ['startedAt', 'seatId', 'expiresAt', 'endedAt', 'endReason', 'purchasedMinutes'] },
];

const show = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) ? formatTime(value) : value === null || value === undefined ? '—' : String(value);

function PagedTable({ path, columns }: { path: string; columns: string[] }) {
  const page = usePaged<Row>(path);
  return (
    <Status loading={page.loading && page.items.length === 0} error={page.error} empty={!page.loading && page.items.length === 0}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {page.items.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column}>{show(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {page.hasMore && <button onClick={() => void page.loadMore()}>Tải thêm</button>}
    </Status>
  );
}

/** Cảnh báo chỉ là nghi vấn: cho đánh dấu đã xem/bỏ qua, không có nút khóa tài khoản hay thu hồi thưởng. */
function SignalsTab({ playerId, canReview }: { playerId: string; canReview: boolean }) {
  const page = usePaged<Signal>(`/api/v1/admin/players/${playerId}/signals`);
  const [error, setError] = useState<unknown>(null);
  const review = async (signal: Signal, status: 'reviewed' | 'dismissed') => {
    const note = window.prompt('Ghi chú (không bắt buộc)') ?? undefined;
    try {
      await api('POST', `/api/v1/admin/signals/${signal.signalId}/review`, { status, note });
      await page.reload();
    } catch (caught) {
      setError(caught);
    }
  };
  return (
    <Status loading={page.loading && page.items.length === 0} error={page.error} empty={!page.loading && page.items.length === 0}>
      <ErrorBanner error={error} />
      <table>
        <thead>
          <tr>
            <th>Nhãn</th>
            <th>Rule</th>
            <th>Mẫu</th>
            <th>Quan sát / ngưỡng</th>
            <th>Lần câu tiêu biểu</th>
            <th>Gần nhất</th>
            <th>Trạng thái</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {page.items.map((signal) => (
            <tr key={signal.signalId}>
              <td>Nghi vấn</td>
              <td>
                {signal.ruleCode} ({signal.ruleVersion})
              </td>
              <td>{signal.sampleCount}</td>
              <td>
                {signal.observedValue.toFixed(1)} / {signal.threshold}
              </td>
              <td>
                <JsonCell value={JSON.stringify(signal.representativeAttemptIds)} />
              </td>
              <td>{formatTime(signal.lastSeenAt)}</td>
              <td>
                {signal.status}
                {signal.reviewNote ? ` — ${signal.reviewNote}` : ''}
              </td>
              <td>
                {canReview && signal.status === 'open' && (
                  <>
                    <button onClick={() => void review(signal, 'reviewed')}>Đã xem</button>
                    <button onClick={() => void review(signal, 'dismissed')}>Bỏ qua</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Status>
  );
}

function PlayerPanel({ playerId, canReview }: { playerId: string; canReview: boolean }) {
  const detail = useLoad(() => api<PlayerDetail>('GET', `/api/v1/admin/players/${playerId}`), [playerId]);
  const [tab, setTab] = useState('ledger');
  const current = TABS.find((item) => item.key === tab);
  return (
    <Status loading={detail.loading} error={detail.error}>
      {detail.data && (
        <div className="panel">
          <h3>{detail.data.displayName}</h3>
          <dl className="facts">
            <dt>Player ID</dt>
            <dd>{detail.data.playerId}</dd>
            <dt>Level / EXP</dt>
            <dd>
              {detail.data.level} / {detail.data.exp}
            </dd>
            <dt>Gold</dt>
            <dd>{detail.data.gold}</dd>
            <dt>Tổng ledger</dt>
            <dd className={detail.data.ledgerTotal === detail.data.gold ? 'ok' : 'error'}>{detail.data.ledgerTotal}</dd>
            <dt>Cần</dt>
            <dd>
              {detail.data.rods.join(', ')} (đang dùng {detail.data.equippedRodId})
            </dd>
            <dt>Cảnh báo mở</dt>
            <dd>{detail.data.openSignals}</dd>
          </dl>
          <div className="tabs">
            {[...TABS, { key: 'signals', label: 'Nghi vấn', columns: [] }].map((item) => (
              <button key={item.key} className={item.key === tab ? 'active' : undefined} onClick={() => setTab(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          {current ? (
            <PagedTable key={tab} path={`/api/v1/admin/players/${playerId}/${current.key}`} columns={current.columns} />
          ) : (
            <SignalsTab playerId={playerId} canReview={canReview} />
          )}
        </div>
      )}
    </Status>
  );
}

export function PlayersPage({ canReview }: { canReview: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSummary[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const search = async () => {
    try {
      setResults(await api<PlayerSummary[]>('GET', `/api/v1/admin/players?query=${encodeURIComponent(query)}`));
      setError(null);
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <section>
      <h2>Người chơi</h2>
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <input placeholder="Tên hoặc playerId" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button type="submit" disabled={!query.trim()}>
          Tìm
        </button>
      </form>
      <Status loading={false} error={error} empty={results?.length === 0}>
        {results && (
          <ul className="list">
            {results.map((player) => (
              <li key={player.playerId}>
                <button className={player.playerId === selected ? 'active' : undefined} onClick={() => setSelected(player.playerId)}>
                  {player.displayName} · Lv{player.level}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Status>
      {selected && <PlayerPanel playerId={selected} canReview={canReview} />}
    </section>
  );
}
