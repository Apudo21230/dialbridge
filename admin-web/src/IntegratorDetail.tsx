import { useEffect, useState } from 'react';
import { api, type IntegratorDetail } from './api';
import { StatusBadge, KeyLine, CopyButton, Waveform, initials, when } from './ui';

export function IntegratorDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<IntegratorDetail | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setD(await api.getIntegrator(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!d) {
    return error ? <div className="alert">{error}</div> : <div className="empty"><Waveform /></div>;
  }

  const liveKeys = d.keys.filter((k) => !k.revokedAt).length;

  return (
    <>
      <button className="backlink" onClick={onBack}>← All integrators</button>

      <div className="row" style={{ gap: 14, marginBottom: 6 }}>
        <span className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>{initials(d.name)}</span>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, margin: 0 }}>{d.name}</h2>
        <StatusBadge status={d.status} />
        <span className="spacer" />
        {d.status === 'active' ? (
          <button className="btn btn--danger" onClick={() => void run(() => api.suspend(id))}>Deactivate</button>
        ) : (
          <button className="btn btn--primary" onClick={() => void run(() => api.activate(id))}>Activate</button>
        )}
      </div>

      <div className="meta">
        <div>
          <div className="meta__k">Integrator ID</div>
          <div className="meta__v mono">{d.id}</div>
        </div>
        <div>
          <div className="meta__k">Active keys</div>
          <div className="meta__v num">{liveKeys}</div>
        </div>
        <div>
          <div className="meta__k">Added</div>
          <div className="meta__v">{new Date(d.createdAt).toLocaleString('en-IN')}</div>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <h3 className="section-title">API keys</h3>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Key label (e.g. production)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          className="btn btn--primary"
          onClick={() =>
            void run(async () => {
              const r = await api.issueKey(id, label.trim() || 'default');
              setNewKey(r.apiKey);
              setLabel('');
            })
          }
        >
          Issue key
        </button>
      </div>

      {newKey && (
        <div className="keyreveal">
          <span className="keyreveal__label">New key</span>
          <KeyLine value={newKey} />
          <span className="faint" style={{ fontSize: 12 }}>Shown once — copy it now.</span>
        </div>
      )}

      <div className="panel">
        <div className="panel__body">
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Key prefix</th>
                <th>Last used</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {d.keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.label}</td>
                  <td>
                    <span className="keyline">
                      <span className="keyline__text">{k.prefix}…</span>
                      <CopyButton value={k.prefix} label="Prefix" />
                    </span>
                  </td>
                  <td className="faint">{k.lastUsedAt ? when(k.lastUsedAt) : 'never'}</td>
                  <td><StatusBadge status={k.revokedAt ? 'failed' : 'active'} /></td>
                  <td style={{ textAlign: 'right' }}>
                    {!k.revokedAt && (
                      <button className="btn btn--danger btn--sm" onClick={() => void run(() => api.revokeKey(k.id))}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
