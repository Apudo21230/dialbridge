import { useEffect, useState } from 'react';
import { api, type CallRecord } from './api';
import { StatusBadge, CopyButton, Waveform, money, duration, when } from './ui';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'in_progress', label: 'Live' },
  { id: 'ringing', label: 'Ringing' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
];

export function Calls() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [status, setStatus] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(cursor?: string, append = false) {
    try {
      const res = await api.listCalls({ status: status || undefined, cursor, limit: 25 });
      setCalls((prev) => (append ? [...prev, ...res.calls] : res.calls));
      setNextCursor(res.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <>
      <div className="toolbar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`btn btn--sm ${status === f.id ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Bridged calls</h2>
          <span className="faint" style={{ fontSize: 12 }}>Real phone numbers are masked — never stored.</span>
        </div>
        <div className="panel__body">
          {loading ? (
            <div className="empty"><Waveform /></div>
          ) : calls.length === 0 ? (
            <div className="empty">
              <div className="empty__wave"><Waveform live={false} /></div>
              <div className="empty__title">No calls here yet</div>
              <div className="empty__hint">When an integrator bridges a call, it lands in this log with its recording.</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Integrator</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Masked line</th>
                  <th>Duration</th>
                  <th>Cost</th>
                  <th>Recording</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id}>
                    <td>{c.integratorName}</td>
                    <td className="mono muted">{c.userRef ?? '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="mono faint">{c.virtualNumber ?? '—'}</td>
                    <td className="num" title={c.maxSeconds ? `cap ${duration(c.maxSeconds)}` : undefined}>
                      {duration(c.billableSeconds)}
                    </td>
                    <td className="num">{money(c.cost)}</td>
                    <td>
                      {c.recordingUrl ? (
                        <span className="row" style={{ gap: 7 }}>
                          <a className="btn btn--sm btn--ghost" href={c.recordingUrl} target="_blank" rel="noreferrer">
                            ▶ Play
                          </a>
                          <CopyButton value={c.recordingUrl} label="Link" />
                        </span>
                      ) : (
                        <span className="faint">—</span>
                      )}
                    </td>
                    <td className="faint">{when(c.createdAt)}</td>
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
