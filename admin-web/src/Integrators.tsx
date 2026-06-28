import { useEffect, useState, type FormEvent } from 'react';
import { api, type IntegratorSummary } from './api';
import { StatusBadge, KeyLine, Waveform, initials, when } from './ui';

export function Integrators({ onSelect }: { onSelect: (id: string) => void }) {
  const [items, setItems] = useState<IntegratorSummary[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(cursor?: string, append = false) {
    try {
      const res = await api.listIntegrators({ search: search || undefined, status: status || undefined, cursor });
      setItems((prev) => (append ? [...prev, ...res.integrators] : res.integrators));
      setNextCursor(res.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
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
    <>
      <form className="toolbar" onSubmit={create}>
        <input
          className="input"
          placeholder="New integrator name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn btn--primary" type="submit" disabled={!newName.trim()}>Add integrator</button>
        <span className="spacer" />
        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </form>

      {createdKey && (
        <div className="keyreveal">
          <span className="keyreveal__label">New key</span>
          <KeyLine value={createdKey} />
          <span className="faint" style={{ fontSize: 12 }}>Shown once — copy it now.</span>
        </div>
      )}

      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">All integrators</h2>
          <span className="faint" style={{ fontSize: 12 }}>{items.length} shown</span>
        </div>
        <div className="panel__body">
          {loading ? (
            <div className="empty"><Waveform /></div>
          ) : items.length === 0 ? (
            <div className="empty">
              <div className="empty__wave"><Waveform live={false} /></div>
              <div className="empty__title">No integrators match</div>
              <div className="empty__hint">Add one above to mint its first API key.</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="is-click" onClick={() => onSelect(i.id)}>
                    <td>
                      <span className="table__name">
                        <span className="avatar">{initials(i.name)}</span>
                        {i.name}
                      </span>
                    </td>
                    <td><StatusBadge status={i.status} /></td>
                    <td className="faint">{when(i.createdAt)}</td>
                    <td className="faint" style={{ textAlign: 'right' }}>Manage →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {nextCursor && (
        <button className="btn" style={{ marginTop: 14 }} onClick={() => void load(nextCursor, true)}>
          Load more
        </button>
      )}
    </>
  );
}
