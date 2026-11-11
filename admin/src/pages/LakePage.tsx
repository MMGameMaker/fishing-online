import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatTime } from '../time';
import type { LakeView, PopulationView } from '../types';
import { Status, useLoad } from '../ui';

const POLL_MS = 3000;

/** Bảng tồn cá. Chỉ hiển thị số Server trả, không tự cộng; không có nút sửa tồn trực tiếp. */
export function PopulationTable({ rows, updatedAt }: { rows: PopulationView[]; updatedAt: string | null }) {
  return (
    <>
      <p className="muted">Cập nhật lúc {formatTime(updatedAt)}</p>
      <table>
        <thead>
          <tr>
            <th>Loài</th>
            <th title="remaining">Còn trong hồ</th>
            <th title="reserved">Đang giữ cho lần câu</th>
            <th title="available = remaining − reserved">Còn câu được</th>
            <th>Đã thả (gồm tồn đầu)</th>
            <th>Đã bắt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.speciesId}>
              <td>{row.speciesId}</td>
              <td>{row.remaining}</td>
              <td>{row.reserved}</td>
              <td>{row.available}</td>
              <td>{row.stocked}</td>
              <td>{row.caught}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function LakePage() {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const lake = useLoad(async () => {
    const value = await api<LakeView>('GET', '/api/v1/admin/lake');
    setUpdatedAt(new Date().toISOString());
    return value;
  }, []);
  const { reload } = lake;

  useEffect(() => {
    const timer = window.setInterval(() => void reload(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  return (
    <section>
      <h2>Hồ {lake.data?.lakeId}</h2>
      <Status loading={lake.loading && !lake.data} error={lake.error}>
        {lake.data && (
          <>
            <h3>Ghế</h3>
            <div className="seats">
              {lake.data.seats.map((seat) => (
                <div key={seat.seatId} className={`seat ${seat.state}`}>
                  <strong>{seat.seatId}</strong>
                  <span>{seat.state}</span>
                  {seat.occupantPlayerId && (
                    <span>
                      {lake.data?.onlinePlayers.find((player) => player.playerId === seat.occupantPlayerId)?.displayName ??
                        seat.occupantPlayerId.slice(0, 8)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <h3>Đang online ({lake.data.onlinePlayers.length})</h3>
            <ul className="list">
              {lake.data.onlinePlayers.map((player) => (
                <li key={player.playerId}>
                  {player.displayName} {player.seatId ? `· ${player.seatId}` : ''} {player.fishing ? '· đang câu' : ''}
                </li>
              ))}
            </ul>
            <h3>Tồn cá</h3>
            <PopulationTable rows={lake.data.population} updatedAt={updatedAt} />
          </>
        )}
      </Status>
    </section>
  );
}
