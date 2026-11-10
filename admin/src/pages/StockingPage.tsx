import { useEffect, useRef, useState } from 'react';
import { api, newKey } from '../api';
import { TIME_ZONES, formatTime, zonedToUtc } from '../time';
import type { CatalogFish, LakeView, StockingBatch, StockingLine } from '../types';
import { ErrorBanner, Status, useLoad, usePaged } from '../ui';
import { AuditTable } from './AuditPage';
import { PopulationTable } from './LakePage';

const LAKE_ID = 'lake-01';
const STATUSES = ['', 'draft', 'scheduled', 'completed', 'cancelled', 'failed'];
const REFRESH_MS = 5000;

interface FormLine {
  speciesId: string;
  quantity: string;
}

export function totals(lines: FormLine[]): { species: number; fish: number } {
  const valid = lines.filter((line) => line.speciesId && Number(line.quantity) > 0);
  return { species: new Set(valid.map((line) => line.speciesId)).size, fish: valid.reduce((sum, line) => sum + Number(line.quantity), 0) };
}

function CreateForm({ fish, onCreated }: { fish: CatalogFish[]; onCreated: (batch: StockingBatch) => void }) {
  const [lines, setLines] = useState<FormLine[]>([{ speciesId: '', quantity: '' }]);
  const [when, setWhen] = useState('');
  const [timeZone, setTimeZone] = useState(TIME_ZONES[0]!);
  const [note, setNote] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  // Giữ cùng key tới khi tạo thành công: bấm lại sau lỗi mạng không tạo đợt thứ hai.
  const key = useRef(newKey());
  const sum = totals(lines);

  const update = (index: number, patch: Partial<FormLine>) => setLines(lines.map((line, at) => (at === index ? { ...line, ...patch } : line)));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        lakeId: LAKE_ID,
        lines: lines.filter((line) => line.speciesId).map((line): StockingLine => ({ speciesId: line.speciesId, quantity: Number(line.quantity) })),
        scheduledAt: when ? zonedToUtc(when, timeZone) : null,
        timeZone,
        note: note || null,
      };
      const batch = await api<StockingBatch>('POST', '/api/v1/admin/stocking', body, { idempotencyKey: key.current });
      key.current = newKey();
      setLines([{ speciesId: '', quantity: '' }]);
      onCreated(batch);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h3>Tạo đợt thả</h3>
      {lines.map((line, index) => (
        <div className="row" key={index}>
          <select aria-label={`Loài ${index + 1}`} value={line.speciesId} onChange={(event) => update(index, { speciesId: event.target.value })}>
            <option value="">Chọn loài</option>
            {fish.map((item) => (
              <option key={item.speciesId} value={item.speciesId}>
                {item.name} ({item.rarity})
              </option>
            ))}
          </select>
          <input
            aria-label={`Số lượng ${index + 1}`}
            type="number"
            min={1}
            step={1}
            value={line.quantity}
            onChange={(event) => update(index, { quantity: event.target.value })}
          />
          <button type="button" onClick={() => setLines(lines.filter((_, at) => at !== index))} disabled={lines.length === 1}>
            Bỏ
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setLines([...lines, { speciesId: '', quantity: '' }])}>
        Thêm loài
      </button>
      <p>
        Tổng: <strong>{sum.species}</strong> loài, <strong>{sum.fish}</strong> con
      </p>
      <div className="row">
        <label>
          Thả lúc (để trống nếu thả ngay)
          <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} />
        </label>
        <label>
          Múi giờ
          <select value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>
            {TIME_ZONES.map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Ghi chú
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
      </label>
      <button type="submit" className="primary" disabled={busy || sum.fish === 0}>
        Tạo đợt (nháp)
      </button>
      <ErrorBanner error={error} />
    </form>
  );
}

function Detail({ batch, canWrite, canExecute, canAudit, onChanged }: {
  batch: StockingBatch;
  canWrite: boolean;
  canExecute: boolean;
  canAudit: boolean;
  onChanged: (batch: StockingBatch) => void;
}) {
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const act = async (action: 'schedule' | 'cancel' | 'execute-now', question: string) => {
    if (!window.confirm(question)) return;
    setBusy(true);
    setError(null);
    try {
      onChanged(await api<StockingBatch>('POST', `/api/v1/admin/stocking/${batch.batchId}/${action}`, { expectedRevision: batch.revision }));
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };
  const open = batch.status === 'draft' || batch.status === 'scheduled';
  return (
    <div className="panel">
      <h3>Đợt {batch.batchId.slice(0, 8)}</h3>
      <dl className="facts">
        <dt>Trạng thái</dt>
        <dd>{batch.status}</dd>
        <dt>Hồ</dt>
        <dd>{batch.lakeId}</dd>
        <dt>Dự kiến</dt>
        <dd>
          {batch.speciesCount} loài, {batch.totalFish} con
        </dd>
        <dt>Lịch</dt>
        <dd>
          {formatTime(batch.scheduledAt, batch.timeZone ?? undefined)} {batch.timeZone ?? ''}
        </dd>
        <dt>Tạo bởi</dt>
        <dd>
          {batch.createdBy} lúc {formatTime(batch.createdAt)}
        </dd>
        <dt>Thực hiện</dt>
        <dd>{batch.executedAt ? `${batch.executedBy} lúc ${formatTime(batch.executedAt)}` : '—'}</dd>
        {batch.error && (
          <>
            <dt>Lỗi</dt>
            <dd className="error">{batch.error}</dd>
          </>
        )}
      </dl>
      <ul>
        {batch.lines.map((line) => (
          <li key={line.speciesId}>
            {line.speciesId}: {line.quantity}
          </li>
        ))}
      </ul>
      <div className="row">
        {canWrite && batch.status === 'draft' && batch.scheduledAt && (
          <button disabled={busy} onClick={() => void act('schedule', `Đặt lịch thả lúc ${formatTime(batch.scheduledAt, batch.timeZone ?? undefined)}?`)}>
            Đặt lịch
          </button>
        )}
        {canExecute && open && (
          <button className="primary" disabled={busy} onClick={() => void act('execute-now', `Thả ngay ${batch.totalFish} con vào ${batch.lakeId}?`)}>
            Thả ngay
          </button>
        )}
        {canWrite && open && (
          <button disabled={busy} onClick={() => void act('cancel', 'Hủy đợt thả này?')}>
            Hủy
          </button>
        )}
      </div>
      <ErrorBanner error={error} />
      {canAudit && (
        <>
          <h4>Lịch sử</h4>
          <AuditTable key={`${batch.batchId}:${batch.revision}`} path={`/api/v1/admin/audit?target=${batch.batchId}`} />
        </>
      )}
    </div>
  );
}

export function StockingPage({ canWrite, canExecute, canAudit, canSeeLake }: {
  canWrite: boolean;
  canExecute: boolean;
  canAudit: boolean;
  canSeeLake: boolean;
}) {
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<StockingBatch | null>(null);
  const query = new URLSearchParams({ lakeId: LAKE_ID });
  if (status) query.set('status', status);
  if (from) query.set('from', new Date(from).toISOString());
  if (to) query.set('to', new Date(to).toISOString());
  const list = usePaged<StockingBatch>(`/api/v1/admin/stocking?${query.toString()}`);
  const catalog = useLoad(() => api<{ fish: CatalogFish[] }>('GET', '/api/v1/catalog'), []);
  const lake = useLoad(() => (canSeeLake ? api<LakeView>('GET', '/api/v1/admin/lake') : Promise.resolve(null)), [canSeeLake]);
  const [lakeTime, setLakeTime] = useState<string | null>(null);

  // Scheduler chạy phía Server nên làm mới danh sách và đợt đang xem định kỳ.
  const { reload: reloadList } = list;
  const selectedId = selected?.batchId;
  useEffect(() => {
    const timer = window.setInterval(() => {
      void reloadList();
      if (selectedId)
        void api<StockingBatch>('GET', `/api/v1/admin/stocking/${selectedId}`)
          .then(setSelected)
          .catch(() => undefined);
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [reloadList, selectedId]);

  const changed = (batch: StockingBatch) => {
    setSelected(batch);
    void list.reload();
    void lake.reload().then(() => setLakeTime(new Date().toISOString()));
  };

  return (
    <section>
      <h2>Thả cá</h2>
      <div className="row">
        <label>
          Trạng thái
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value || 'Tất cả'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Từ
          <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          Đến
          <input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>
      <Status loading={list.loading && list.items.length === 0} error={list.error} empty={!list.loading && list.items.length === 0}>
        <table>
          <thead>
            <tr>
              <th>Tạo lúc</th>
              <th>Trạng thái</th>
              <th>Loài / con</th>
              <th>Lịch</th>
              <th>Người tạo</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((batch) => (
              <tr key={batch.batchId} className={batch.batchId === selected?.batchId ? 'active' : undefined} onClick={() => setSelected(batch)}>
                <td>{formatTime(batch.createdAt)}</td>
                <td>{batch.status}</td>
                <td>
                  {batch.speciesCount} / {batch.totalFish}
                </td>
                <td>{formatTime(batch.scheduledAt, batch.timeZone ?? undefined)}</td>
                <td>{batch.createdBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.hasMore && <button onClick={() => void list.loadMore()}>Tải thêm</button>}
      </Status>
      <div className="split">
        {canWrite && catalog.data && <CreateForm fish={catalog.data.fish} onCreated={changed} />}
        {selected && <Detail batch={selected} canWrite={canWrite} canExecute={canExecute} canAudit={canAudit} onChanged={changed} />}
      </div>
      {canSeeLake && (
        <>
          <h3>Tồn cá trong hồ</h3>
          <Status loading={lake.loading && !lake.data} error={lake.error}>
            {lake.data && <PopulationTable rows={lake.data.population} updatedAt={lakeTime} />}
            <button onClick={() => void lake.reload().then(() => setLakeTime(new Date().toISOString()))}>Làm mới</button>
          </Status>
        </>
      )}
    </section>
  );
}
