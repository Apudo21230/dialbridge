import { type CallRecord } from './api';
import { StatusBadge, CopyButton, Waveform, money, duration, when } from './ui';

/** Shared call log — used both platform-wide and scoped to one integrator. */
export function CallsTable({ calls, showIntegrator = true }: { calls: CallRecord[]; showIntegrator?: boolean }) {
  if (calls.length === 0) {
    return (
      <div className="empty">
        <div className="empty__wave"><Waveform live={false} /></div>
        <div className="empty__title">No calls here yet</div>
        <div className="empty__hint">When a call is bridged, it lands in this log with its recording.</div>
      </div>
    );
  }

  return (
    <table className="table">
      <thead>
        <tr>
          {showIntegrator && <th>Integrator</th>}
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
            {showIntegrator && <td>{c.integratorName}</td>}
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
                  <a className="btn btn--sm btn--ghost" href={c.recordingUrl} target="_blank" rel="noreferrer">▶ Play</a>
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
  );
}
