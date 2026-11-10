import { useEffect, useState } from 'react';
import { currentSession, logout, onSessionChange, refresh } from './api';
import { firebaseSignOut } from './firebase';
import { AuditPage } from './pages/AuditPage';
import { ConfigPage } from './pages/ConfigPage';
import { LakePage } from './pages/LakePage';
import { LoginPage } from './pages/LoginPage';
import { PlayersPage } from './pages/PlayersPage';
import { StockingPage } from './pages/StockingPage';
import type { AdminSession } from './types';

type PageKey = 'config' | 'players' | 'lake' | 'stocking' | 'audit';

const PAGES: { key: PageKey; label: string; permission: string }[] = [
  { key: 'config', label: 'Config', permission: 'config.read' },
  { key: 'players', label: 'Người chơi', permission: 'player.read' },
  { key: 'lake', label: 'Hồ', permission: 'player.read' },
  { key: 'stocking', label: 'Thả cá', permission: 'stocking.read' },
  { key: 'audit', label: 'Audit', permission: 'audit.read' },
];

export function App() {
  const [session, setSession] = useState<AdminSession | null>(currentSession());
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState<PageKey | null>(null);

  useEffect(() => {
    const unsubscribe = onSessionChange(setSession);
    void refresh().finally(() => setChecking(false));
    return unsubscribe;
  }, []);

  if (checking) return <p className="muted">Đang kiểm tra phiên…</p>;
  if (!session) return <LoginPage />;

  const can = (permission: string) => session.permissions.includes(permission);
  const visible = PAGES.filter((item) => can(item.permission));
  const current = page && visible.some((item) => item.key === page) ? page : visible[0]?.key;

  return (
    <div className="app">
      <header>
        <strong>Fishing Online Admin</strong>
        <nav>
          {visible.map((item) => (
            <button key={item.key} className={item.key === current ? 'active' : undefined} onClick={() => setPage(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>
        <span className="muted">{session.email}</span>
        <button
          onClick={() => {
            void logout();
            void firebaseSignOut();
          }}
        >
          Đăng xuất
        </button>
      </header>
      <main>
        {!current && <p className="denied">Tài khoản chưa được cấp quyền nào.</p>}
        {current === 'config' && <ConfigPage canWrite={can('config.write')} canPublish={can('config.publish')} />}
        {current === 'players' && <PlayersPage canReview={can('signal.review')} />}
        {current === 'lake' && <LakePage />}
        {current === 'stocking' && (
          <StockingPage
            canWrite={can('stocking.write')}
            canExecute={can('stocking.execute')}
            canAudit={can('audit.read')}
            canSeeLake={can('player.read')}
          />
        )}
        {current === 'audit' && <AuditPage />}
      </main>
    </div>
  );
}
