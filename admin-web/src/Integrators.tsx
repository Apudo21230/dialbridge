import { useEffect, useState, type FormEvent } from 'react';
import { api, type IntegratorSummary } from './api';

export function Integrators({ onSelect }: { onSelect: (id: string) => void }) {
  const [items, setItems] = useState<IntegratorSummary[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load(cursor?: string, append = false) {
    try {
      const res = await api.listIntegrators({ search: search || undefined, status: status || undefined, cursor });
      setItems((prev) => (append ? [...prev, ...res.integrators] : res.integrators));
      setNextCursor(res.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError('');
    setCreatedKey(null);
    try {
      const r = await api.createIntegrator(newName.trim());
      setCreatedKey(r.apiKey);
      setNewName('');
      void load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section>
      <form onSubmit={create} style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input placeholder="new integrator name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" disabled={!newName.trim()}>Create</button>
      </form>

      {createdKey && (
        <div style={{ background: '#fffae6', padding: 8, borderRadius: 6, marginBottom: 12 }}>
          API key (shown once): <code>{createdKey}</code>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="search name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">all</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
        </select>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Status</th>
            <th align="left">Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} style={{ cursor: 'pointer', borderTop: '1px solid #eee' }} onClick={() => onSelect(i.id)}>
              <td>{i.name}</td>
              <td>{i.status}</td>
              <td>{new Date(i.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {nextCursor && (
        <button onClick={() => void load(nextCursor, true)} style={{ marginTop: 12 }}>
          Load more
        </button>
      )}
    </section>
  );
}
