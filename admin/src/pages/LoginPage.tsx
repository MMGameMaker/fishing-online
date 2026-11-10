import { useRef, useState } from 'react';
import { login } from '../api';
import { firebaseSignOut, googleIdToken } from '../firebase';
import { ErrorBanner } from '../ui';

export function LoginPage() {
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [askingCode, setAskingCode] = useState(false);
  const [code, setCode] = useState('');
  const pending = useRef<(value: string) => void>(undefined);

  const askCode = () =>
    new Promise<string>((resolve) => {
      pending.current = resolve;
      setAskingCode(true);
    });

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await login(await googleIdToken(askCode));
    } catch (caught) {
      setError(caught);
      await firebaseSignOut();
    } finally {
      setBusy(false);
      setAskingCode(false);
    }
  };

  return (
    <main className="login">
      <h1>Fishing Online Admin</h1>
      <p className="muted">Đăng nhập bằng tài khoản Google đã được cấp quyền Admin và đã bật xác thực hai bước.</p>
      {askingCode ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            pending.current?.(code.trim());
          }}
        >
          <label>
            Mã xác thực 6 số
            <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoFocus />
          </label>
          <button type="submit">Xác nhận</button>
        </form>
      ) : (
        <button onClick={() => void signIn()} disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập Google'}
        </button>
      )}
      <ErrorBanner error={error} />
    </main>
  );
}
