import { useState } from 'react';
import { getToken, setToken } from './api';
import { Waveform } from './ui';
import { Login } from './Login';
import { Overview } from './Overview';
import { Integrators } from './Integrators';
import { IntegratorDetailView } from './IntegratorDetail';
import { Calls } from './Calls';

type View = 'overview' | 'integrators' | 'calls';

const NAV: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'integrators', label: 'Integrators' },
  { id: 'calls', label: 'Calls & recordings' },
];

const TITLES: Record<View, { title: string; hint: string }> = {
  overview: { title: 'Overview', hint: 'Live state of the masked-call network.' },
  integrators: { title: 'Integrators', hint: 'Businesses on the platform and their API keys.' },
  calls: { title: 'Calls & recordings', hint: 'Every bridged call. Real numbers are never stored.' },
};

export function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [view, setView] = useState<View>('overview');
  const [selected, setSelected] = useState<string | null>(null);

  const [email] = useState(() => {
    try {
      const t = getToken();
      if (!t) return '';
      return JSON.parse(atob(t.split('.')[1])).email ?? '';
    } catch {
      return '';
    }
  });

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  function go(v: View) {
    setSelected(null);
    setView(v);
  }

  const head = TITLES[view];

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <Waveform />
          <div>
            <div className="brand__name">Dialbridge</div>
            <div className="brand__sub">Signal Desk</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav__item ${view === n.id ? 'is-active' : ''}`}
              onClick={() => go(n.id)}
            >
              <span className="nav__dot" />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="side__foot">
          {email && <div className="side__who" title={email}>{email}</div>}
          <button className="btn btn--ghost btn--sm" onClick={() => { setToken(null); setAuthed(false); }}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="topbar__title">{head.title}</h1>
            <p className="topbar__hint">{head.hint}</p>
          </div>
        </header>

        <div className="content">
          {view === 'overview' && <Overview onOpenCalls={() => go('calls')} />}
          {view === 'integrators' &&
            (selected ? (
              <IntegratorDetailView id={selected} onBack={() => setSelected(null)} />
            ) : (
              <Integrators onSelect={setSelected} />
            ))}
          {view === 'calls' && <Calls />}
        </div>
      </main>
    </div>
  );
}
