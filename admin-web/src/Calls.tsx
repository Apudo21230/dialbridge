import { useEffect, useState } from 'react';
import { api, type CallRecord } from './api';
import { Waveform } from './ui';
import { CallsTable } from './CallsTable';

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
          {loading ? <div className="empty"><Waveform /></div> : <CallsTable calls={calls} />}
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
