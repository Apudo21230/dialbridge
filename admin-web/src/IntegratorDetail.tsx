import { useEffect, useState } from 'react';
import { api, type IntegratorDetail, type EndUser, type CallRecord } from './api';
import { StatusBadge, KeyLine, CopyButton, Waveform, money, when, initials } from './ui';
import { CallsTable } from './CallsTable';

type Tab = 'keys' | 'users' | 'calls';

export function IntegratorDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<IntegratorDetail | null>(null);
  const [tab, setTab] = useState<Tab>('keys');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  const [users, setUsers] = useState<EndUser[] | null>(null);
  const [calls, setCalls] = useState<CallRecord[] | null>(null);
  const [notice, setNotice] = useState('');

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

  useEffect(() => {
    if (tab === 'users' && !users) api.listUsers(id).then((r) => setUsers(r.users)).catch((e) => setError(e.message));
    if (tab === 'calls' && !calls) api.listCalls({ integratorId: id, limit: 50 }).then((r) => setCalls(r.calls)).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggleBlock(u: EndUser) {
    setError('');
    setNotice('');
    try {
      const r = u.status === 'blocked' ? await api.unblockUser(id, u.userRef) : await api.blockUser(id, u.userRef);
      if (r.status === 'blocked' && r.cutCalls.length) setNotice(`Blocked ${u.userRef} — cut ${r.cutCalls.length} active call(s).`);
      const fresh = await api.listUsers(id);
      setUsers(fresh.users);
      setCalls(null); // call statuses may have changed
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!d) return error ? <div className="alert">{error}</div> : <div className="empty"><Waveform /></div>;

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
        <div><div className="meta__k">Integrator ID</div><div className="meta__v mono">{d.id}</div></div>
        <div><div className="meta__k">Active keys</div><div className="meta__v num">{liveKeys}</div></div>
        <div><div className="meta__k">Added</div><div className="meta__v">{new Date(d.createdAt).toLocaleString('en-IN')}</div></div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="tabs">
        <button className={`tab ${tab === 'keys' ? 'is-active' : ''}`} onClick={() => setTab('keys')}>
          API keys <span className="tab__count">{d.keys.length}</span>
        </button>
        <button className={`tab ${tab === 'users' ? 'is-active' : ''}`} onClick={() => setTab('users')}>
          Users {users && <span className="tab__count">{users.length}</span>}
        </button>
        <button className={`tab ${tab === 'calls' ? 'is-active' : ''}`} onClick={() => setTab('calls')}>
          Calls {calls && <span className="tab__count">{calls.length}</span>}
        </button>
      </div>

      {tab === 'keys' && (
        <>
          <div className="toolbar">
            <input className="input" placeholder="Key label (e.g. production)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <button
              className="btn btn--primary"
              onClick={() => void run(async () => {
                const r = await api.issueKey(id, label.trim() || 'default');
                setNewKey(r.apiKey);
                setLabel('');
              })}
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
                  <tr><th>Label</th><th>Key prefix</th><th>Last used</th><th>Status</th><th></th></tr>
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
                          <button className="btn btn--danger btn--sm" onClick={() => void run(() => api.revokeKey(k.id))}>Revoke</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'users' && (
        <>
          {notice && <div className="keyreveal"><span className="keyreveal__label">Done</span><span>{notice}</span></div>}
          <div className="panel">
            <div className="panel__head">
              <h2 className="panel__title">End-users</h2>
              <span className="faint" style={{ fontSize: 12 }}>Block to cut their live calls and stop new ones.</span>
            </div>
            <div className="panel__body">
              {!users ? (
                <div className="empty"><Waveform /></div>
              ) : users.length === 0 ? (
                <div className="empty">
                  <div className="empty__wave"><Waveform live={false} /></div>
                  <div className="empty__title">No users yet</div>
                  <div className="empty__hint">Users appear once this integrator places a call or tops up a balance.</div>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>User</th><th>Status</th><th>Balance</th><th>Calls</th><th>Last active</th><th></th></tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.userRef}>
                        <td className="mono">{u.userRef}</td>
                        <td><StatusBadge status={u.status === 'blocked' ? 'suspended' : 'active'} /></td>
                        <td className="num">{money(u.balance)}</td>
                        <td className="num">{u.totalCalls}</td>
                        <td className="faint">{u.lastCallAt ? when(u.lastCallAt) : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          {u.status === 'blocked' ? (
                            <button className="btn btn--primary btn--sm" onClick={() => void toggleBlock(u)}>Unblock</button>
                          ) : (
                            <button className="btn btn--danger btn--sm" onClick={() => void toggleBlock(u)}>Block</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'calls' && (
        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Calls by {d.name}</h2>
            <span className="faint" style={{ fontSize: 12 }}>Real phone numbers are masked — never stored.</span>
          </div>
          <div className="panel__body">
            {!calls ? <div className="empty"><Waveform /></div> : <CallsTable calls={calls} showIntegrator={false} />}
          </div>
        </div>
      )}
    </>
  );
}
