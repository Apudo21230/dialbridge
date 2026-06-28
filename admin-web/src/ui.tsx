import { useState } from 'react';

/* -------- formatters (paise + seconds → human) --------------------------- */
export function money(paise: number | null | undefined): string {
  if (paise == null) return '—';
  return '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function duration(seconds: number | null | undefined): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function when(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}

/* -------- waveform: the brand mark; bars dance only when a line is live --- */
export function Waveform({ live = true, className = '' }: { live?: boolean; className?: string }) {
  return (
    <span className={`wave ${live ? 'wave--mark' : 'wave--still'} ${className}`} aria-hidden>
      <i /><i /><i /><i /><i />
    </span>
  );
}

/* -------- status badge: one vocabulary for calls + integrators ----------- */
const CALL_VARIANT: Record<string, { cls: string; label: string }> = {
  in_progress: { cls: 'badge--live', label: 'connected' },
  ringing: { cls: 'badge--ring', label: 'ringing' },
  created: { cls: 'badge--ring', label: 'connecting' },
  completed: { cls: 'badge--done', label: 'completed' },
  failed: { cls: 'badge--fail', label: 'failed' },
  active: { cls: 'badge--live', label: 'active' },
  suspended: { cls: 'badge--fail', label: 'suspended' },
};

export function StatusBadge({ status }: { status: string }) {
  const v = CALL_VARIANT[status] ?? { cls: 'badge--mute', label: status };
  const live = status === 'in_progress';
  return (
    <span className={`badge ${v.cls}`}>
      <span className="badge__dot" />
      {v.label}
      {live && <Waveform className="" />}
    </span>
  );
}

/* -------- copy-to-clipboard: the thing the user explicitly asked for ----- */
export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard API blocked (e.g. non-secure context) — fall back to a temp textarea
      const t = document.createElement('textarea');
      t.value = value;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  }
  return (
    <button type="button" className={`copy ${done ? 'is-done' : ''}`} onClick={copy} aria-label={`Copy ${label}`}>
      {done ? '✓ Copied' : `⧉ ${label}`}
    </button>
  );
}

/* -------- a monospace secret line with a copy affordance ----------------- */
export function KeyLine({ value }: { value: string }) {
  return (
    <span className="keyline">
      <span className="keyline__text">{value}</span>
      <CopyButton value={value} />
    </span>
  );
}
