import { useState } from 'react';
import { getToken, setToken } from './api';
import { Login } from './Login';
import { Integrators } from './Integrators';
import { IntegratorDetailView } from './IntegratorDetail';

export function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [selected, setSelected] = useState<string | null>(null);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 920, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Dialbridge Admin</h1>
        <button onClick={() => { setToken(null); setAuthed(false); }}>Log out</button>
      </header>
      {selected ? (
        <IntegratorDetailView id={selected} onBack={() => setSelected(null)} />
      ) : (
        <Integrators onSelect={setSelected} />
      )}
    </div>
  );
}
