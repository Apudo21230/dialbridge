import { useState, type FormEvent } from 'react';
import { api, setToken } from './api';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      onLogin();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 320, margin: '80px auto', display: 'grid', gap: 8 }}
    >
      <h1 style={{ fontSize: 20 }}>Dialbridge Admin</h1>
      <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Log in</button>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </form>
  );
}
