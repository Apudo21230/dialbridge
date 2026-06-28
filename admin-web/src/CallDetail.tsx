import { useEffect, useState } from 'react';
import { api, type CallRecord } from './api';
import { StatusBadge, CopyButton, Waveform, money, duration } from './ui';

function secsBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000));
}
function stamp(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
}

/** The operator timeline: connecting → ringing → talk. Real leg timings, no VoIP/network data. */
function Timeline({ c }: { c: CallRecord }) {
  const nowish = c.endedAt ?? new Date().toISOString();
  const connecting = secsBetween(c.createdAt, c.ringingAt);
  const ringing = c.answeredAt ? secsBetween(c.ringingAt, c.answeredAt) : secsBetween(c.ringingAt, c.endedAt);
  const talk = c.answeredAt ? secsBetween(c.answeredAt, nowish) : null;

  const segs = [
    { key: 'connect', label: 'Connecting', s: connecting, sw: 'var(--faint)' },
    { key: 'ring', label: 'Ringing', s: ringing, sw: 'var(--ring)' },
    { key: 'talk', label: 'Talk', s: talk, sw: 'var(--live)' },
  ].filter((x): x is { key: string; label: string; s: number; sw: string } => x.s != null);

  const total = segs.reduce((n, x) => n + x.s, 0);

  return (
    <div className="timeline">
      {total > 0 ? (
        <div className="timeline__bar">
          {segs.map((x) => (
            <div
              key={x.key}
              className={`timeline__seg seg--${x.key}`}
              style={{ flexGrow: Math.max(x.s, 0.5) }}
              title={`${x.label}: ${duration(x.s)}`}
            >
              {x.s >= 2 ? duration(x.s) : ''}
            </div>
          ))}
        </div>
      ) : (
        <div className="faint" style={{ fontSize: 13 }}>No leg timings yet — waiting for the operator's first event.</div>
      )}
      <div className="timeline__legend">
        {segs.map((x) => (
          <span className="legend" key={x.key}>
            <span className="legend__sw" style={{ background: x.sw }} />
            {x.label} <span className="legend__v">{duration(x.s)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Party({ role, value, icon }: { role: string; value: string | null; icon: string }) {
  return (
    <div className="party">
      <span className="party__icon">{icon}</span>
      <div>
        <div className="party__role">{role}</div>
        <div className="dcell__v mono">{value ?? '—'}</div>
      </div>
    </div>
  );
}

export function CallDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [c, setC] = useState<CallRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCall(id).then(setC).catch((e) => setError(e.message));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, onClose]);

  const ticket = c?.ticket ?? c?.bookingId ?? null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <Waveform live={c?.status === 'in_progress'} />
          <h2 className="modal__title">Call detail</h2>
          {c && <StatusBadge status={c.status} />}
          <button className="modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal__body">
          {error ? (
            <div className="alert">{error}</div>
          ) : !c ? (
            <div className="empty"><Waveform /></div>
          ) : (
            <>
              <div className="dgrid">
                <Party role="User" value={c.userRef} icon="◎" />
                <div className="dcell">
                  <div className="meta__k">Ticket</div>
                  <div className="dcell__v">{ticket ? <span className="ticket-chip">🎫 {ticket}<CopyButton value={ticket} label="" /></span> : <span className="faint">—</span>}</div>
                </div>
                <Party role="Caller" value={c.callerRef} icon="↗" />
                <Party role="Receiver" value={c.receiverRef} icon="↘" />
                <div className="dcell">
                  <div className="meta__k">Masked line</div>
                  <div className="dcell__v mono">{c.virtualNumber ?? '—'}</div>
                </div>
                <div className="dcell">
                  <div className="meta__k">Integrator</div>
                  <div className="dcell__v">{c.integratorName}</div>
                </div>
              </div>

              <h3 className="section-title">Call timeline</h3>
              <Timeline c={c} />

              <div className="stamps">
                <div className="stamp"><span className="stamp__k">Created</span><span className="stamp__v">{stamp(c.createdAt)}</span></div>
                <div className="stamp"><span className="stamp__k">Ringing</span><span className="stamp__v">{stamp(c.ringingAt)}</span></div>
                <div className="stamp"><span className="stamp__k">Answered</span><span className="stamp__v">{stamp(c.answeredAt)}</span></div>
                <div className="stamp"><span className="stamp__k">Ended</span><span className="stamp__v">{stamp(c.endedAt)}</span></div>
              </div>

              <h3 className="section-title">Billing & recording</h3>
              <div className="dgrid">
                <div className="dcell"><div className="meta__k">Talk time</div><div className="dcell__v mono">{duration(c.billableSeconds)}</div></div>
                <div className="dcell"><div className="meta__k">Rate / min</div><div className="dcell__v mono">{money(c.ratePerMinute)}</div></div>
                <div className="dcell"><div className="meta__k">Cost</div><div className="dcell__v mono">{money(c.cost)}</div></div>
                <div className="dcell"><div className="meta__k">Provider</div><div className="dcell__v mono">{c.provider}</div></div>
              </div>
              <div style={{ marginTop: 12 }}>
                {c.recordingUrl ? (
                  <span className="row" style={{ gap: 9 }}>
                    <a className="btn btn--sm" href={c.recordingUrl} target="_blank" rel="noreferrer">▶ Play recording</a>
                    <CopyButton value={c.recordingUrl} label="Link" />
                  </span>
                ) : (
                  <span className="faint" style={{ fontSize: 13 }}>No recording.</span>
                )}
              </div>

              <div className="note">
                This is a PSTN masked call — the audio runs on the operator's voice network, not the internet.
                There is no per-leg WiFi/5G or data-usage to chart (that exists only for VoIP). The timeline above is
                built from the operator's real ring/answer/end events.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
