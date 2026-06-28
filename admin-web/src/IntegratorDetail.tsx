import { useEffect, useState } from 'react';
import { api, type IntegratorDetail } from './api';

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
    return (
      <p>
        Loading… {error && <span style={{ color: 'crimson' }}>{error}</span>}
      </p>
    );
  }

  return (
    <section>
      <button onClick={onBack}>← Back</button>
      <h2>
        {d.name}{' '}
        <small style={{ color: d.status === 'active' ? 'green' : 'crimson' }}>({d.status})</small>
      </h2>

      <div style={{ display: 'flex', gap: 8 }}>
        {d.status === 'active' ? (
          <button onClick={() => void run(() => api.suspend(id))}>Deactivate</button>
        ) : (
          <button onClick={() => void run(() => api.activate(id))}>Activate</button>
        )}
      </div>

      <h3>API keys</h3>
      <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
        <input placeholder="key label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button
          onClick={() =>
            void run(async () => {
              const r = await api.issueKey(id, label || 'default');
              setNewKey(r.apiKey);
              setLabel('');
            })
          }
        >
          Issue key
        </button>
      </div>

      {newKey && (
        <div style={{ background: '#fffae6', padding: 8, borderRadius: 6, marginBottom: 12 }}>
          New key (shown once): <code>{newKey}</code>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Label</th>
            <th align="left">Prefix</th>
            <th align="left">Last used</th>
            <th align="left">Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {d.keys.map((k) => (
            <tr key={k.id} style={{ borderTop: '1px solid #eee' }}>
              <td>{k.label}</td>
              <td>
                <code>{k.prefix}…</code>
              </td>
              <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : '—'}</td>
              <td>{k.revokedAt ? 'revoked' : 'active'}</td>
              <td>{!k.revokedAt && <button onClick={() => void run(() => api.revokeKey(k.id))}>Revoke</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </section>
  );
}
