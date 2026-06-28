import { useState, type FormEvent } from 'react';
import { api, setToken } from './api';
import { Waveform } from './ui';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      onLogin();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <Waveform />
          <div>
            <h1 className="login__title">Dialbridge</h1>
            <div className="login__sub">Signal Desk</div>
          </div>
        </div>

        <form className="login__form" onSubmit={submit}>
          <div className="field">
            <label className="field__label" htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@dialbridge.dev"
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="pw">Password</label>
            <input
              id="pw"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
            />
          </div>
          <button className="btn btn--primary" type="submit" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {error && <div className="alert">{error}</div>}
        </form>
      </div>
    </div>
  );
}
