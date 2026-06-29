import { useEffect, useState } from 'react';
import { api, type Overview as OverviewData, type CallRecord } from './api';
import { StatusBadge, Waveform, money, duration, when } from './ui';
import { CallDetail } from './CallDetail';

export function Overview({ onOpenCalls }: { onOpenCalls: () => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [recent, setRecent] = useState<CallRecord[]>([]);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [o, c] = await Promise.all([api.overview(), api.listCalls({ limit: 6 })]);
        setData(o);
        setRecent(c.calls);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!data) return <div className="empty"><Waveform /></div>;

  const minutes = Math.round(data.billableSeconds / 60);

  const cards = [
    { label: 'Integrators', value: data.integrators },
    { label: 'Calls bridged', value: data.calls },
    { label: 'Live now', value: data.activeCalls, live: true },
    { label: 'Recordings', value: data.recordings },
    { label: 'Talk time', value: minutes, unit: 'min' },
    { label: 'Revenue', value: money(data.revenue), raw: true },
  ];

  return (
    <>
      <div className="stats">
        {cards.map((c) => (
          <div className="stat" key={c.label}>
            <div className="stat__label">{c.label}</div>
            <div className="stat__value">
              {c.live && data.activeCalls > 0 && <Waveform />}{' '}
              {c.raw ? c.value : (c.value as number).toLocaleString('en-IN')}
              {c.unit && <span className="stat__unit">{c.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Recent calls</h2>
          <button className="btn btn--ghost btn--sm" onClick={onOpenCalls}>View all →</button>
        </div>
        <div className="panel__body">
          {recent.length === 0 ? (
            <div className="empty">
              <div className="empty__wave"><Waveform live={false} /></div>
              <div className="empty__title">No calls yet</div>
              <div className="empty__hint">Bridged calls will stream in here once an integrator places one.</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Integrator</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Cost</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id} className="is-click" onClick={() => setOpenId(c.id)}>
                    <td>{c.integratorName}</td>
                    <td className="mono muted">{c.userRef ?? '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="num">{duration(c.billableSeconds)}</td>
                    <td className="num">{money(c.cost)}</td>
                    <td className="faint">{when(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {openId && <CallDetail id={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
