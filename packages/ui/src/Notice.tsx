import type { ReactNode } from 'react';

export type Tone = 'warn' | 'error' | 'ok' | 'plain';

/** Inline message with the design's tone colours. Use role="alert" for errors that appear after an action. */
export function Notice({ tone = 'plain', children, alert = false, className = '' }: { tone?: Tone; children: ReactNode; alert?: boolean; className?: string }) {
  return (
    <div role={alert ? 'alert' : undefined} className={`note ${tone === 'plain' ? '' : tone} ${className}`}>
      {children}
    </div>
  );
}

export function Banner({ tone = 'warn', children, actions }: { tone?: Tone; children: ReactNode; actions?: { label: string; onClick: () => void }[] }) {
  return (
    <div role="alert" className={`banner ${tone === 'plain' ? '' : tone}`}>
      <span>{children}</span>
      {actions?.length ? (
        <div className="row wrap g8">
          {actions.map((a) => (
            <button key={a.label} type="button" className="btn btn-xs" style={{ background: 'transparent', color: 'inherit', borderColor: 'currentColor' }} onClick={a.onClick}>{a.label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
