'use client';
import { useId, useState, type ReactNode } from 'react';
import { Photo } from './Photo';

export interface Opt {
  value: string;
  label?: string;
  sub?: string;
  bn?: string;
  eyebrow?: string;
  price?: string;
  img?: string;
  disabled?: boolean;
  reason?: string;
}
export interface AddonItem {
  id: string;
  cat?: string;
  name: string;
  price?: string;
  qty: number;
  disabled?: boolean;
  reason?: string;
  max?: number;
}
export interface RowCol {
  k: string;
  ph: string;
  type?: string;
  flex?: number;
}

export type FieldType =
  | 'text' | 'tel' | 'email' | 'number' | 'password' | 'date' | 'time'
  | 'textarea' | 'select' | 'chips' | 'multi' | 'cards' | 'qty' | 'file' | 'toggle' | 'addons' | 'rows' | 'info';

export interface FieldProps {
  type: FieldType;
  name: string;
  label?: string;
  value?: any;
  onChange?: (v: any) => void;
  error?: string | null;
  hint?: string;
  req?: boolean;
  ph?: string;
  options?: (Opt | string)[];
  maxLen?: number;
  rows?: number;
  min?: string;
  max?: string;
  disabled?: boolean;
  ac?: string;
  cardMin?: string;
  pill?: boolean;
  unit?: string;
  presets?: number[];
  /** addons */
  items?: AddonItem[];
  onQty?: (id: string, qty: number) => void;
  /** rows */
  cols?: RowCol[];
  blank?: Record<string, any>;
  toggleKey?: string;
  toggleLabel?: string;
  addLabel?: string;
  /** file */
  fileName?: string;
  onFile?: (file: File | null) => void;
  /** info */
  tone?: 'warn' | 'error' | 'ok';
  text?: string;
  /** toggle label sits next to the box */
  children?: ReactNode;
}

const norm = (o: Opt | string): Opt => (typeof o === 'string' ? { value: o, label: o } : { ...o, label: o.label ?? o.value });

/** One renderer for every form in the app (text, select, chips, cards, quantity, file, toggle, add-ons, rows, info).
 *  Service booking forms are assembled from configuration with this component, so the owner can edit forms from the admin. */
export function Field(p: FieldProps) {
  const uid = useId();
  const [show, setShow] = useState(false);
  const id = `f-${p.name}-${uid}`.replace(/[^a-zA-Z0-9-]/g, '');
  const hintId = id + '-h';
  const errId = id + '-e';
  const hasErr = !!p.error;
  const describedBy = hasErr ? errId : p.hint ? hintId : undefined;
  const showLabel = !!p.label && !['toggle', 'info'].includes(p.type);
  const v = p.value;
  const opts = (p.options || []).map(norm);
  const err = hasErr ? ' has-error' : '';

  let control: ReactNode = null;
  switch (p.type) {
    case 'password':
      control = (
        <div className="pw">
          <input id={id} className={'input' + err} type={show ? 'text' : 'password'} autoComplete={p.ac || 'off'} value={v == null ? '' : String(v)} placeholder={p.ph} disabled={p.disabled}
            aria-invalid={hasErr} aria-describedby={describedBy} autoCapitalize="off" spellCheck={false} onChange={(e) => p.onChange?.(e.target.value)} />
          <button type="button" className="pw-eye" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((x) => !x)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {show ? null : <path d="M4 4l16 16" />}
            </svg>
          </button>
        </div>
      );
      break;
    case 'text': case 'tel': case 'email': case 'number': case 'date': case 'time':
      control = (
        <input id={id} className={'input' + err} type={p.type === 'number' ? 'text' : p.type} inputMode={p.type === 'number' ? 'numeric' : p.type === 'tel' ? 'tel' : p.type === 'email' ? 'email' : 'text'}
          autoComplete={p.ac || 'off'} value={v == null ? '' : String(v)} min={p.min} max={p.max} placeholder={p.ph} disabled={p.disabled}
          aria-invalid={hasErr} aria-describedby={describedBy} onChange={(e) => p.onChange?.(e.target.value)} />
      );
      break;
    case 'textarea':
      control = <textarea id={id} className={'textarea' + err} rows={p.rows || 4} value={v || ''} placeholder={p.ph} aria-invalid={hasErr} aria-describedby={describedBy} onChange={(e) => p.onChange?.(e.target.value)} />;
      break;
    case 'select':
      control = (
        <select id={id} className={'select' + err} value={v || ''} aria-invalid={hasErr} aria-describedby={describedBy} onChange={(e) => p.onChange?.(e.target.value)}>
          <option value="">{p.ph || 'Choose…'}</option>
          {opts.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
        </select>
      );
      break;
    case 'chips': case 'multi': {
      const multi = p.type === 'multi';
      control = (
        <div role={multi ? 'group' : 'radiogroup'} aria-label={p.label} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {opts.map((o) => {
            const on = multi ? Array.isArray(v) && v.includes(o.value) : v === o.value;
            return (
              <button key={o.value} type="button" className="chip" role={multi ? 'checkbox' : 'radio'} aria-checked={on} aria-pressed={on} disabled={o.disabled} title={o.reason}
                style={p.pill ? { borderRadius: 999 } : undefined}
                onClick={() => { if (o.disabled) return; if (multi) { const cur = Array.isArray(v) ? v : []; p.onChange?.(cur.includes(o.value) ? cur.filter((x: string) => x !== o.value) : [...cur, o.value]); } else p.onChange?.(o.value); }}>
                <span>{o.label}</span>
                {o.sub ? <span className="sub">{o.sub}</span> : null}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case 'cards':
      control = (
        <div role="radiogroup" aria-label={p.label} style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${p.cardMin || '190px'}), 1fr))`, gap: 10 }}>
          {opts.map((o) => (
            <button key={o.value} type="button" role="radio" className="optcard" aria-checked={v === o.value} disabled={o.disabled} onClick={() => !o.disabled && p.onChange?.(o.value)}>
              {o.img ? <Photo src={o.img} ratio="r11" /> : null}
              <span className="body">
                {o.eyebrow ? <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--sage)' }}>{o.eyebrow}</span> : null}
                <span style={{ fontSize: 16, lineHeight: 1.3 }}>{o.label}</span>
                {o.bn ? <span className="bn small muted">{o.bn}</span> : null}
                {o.sub ? <span className="xs muted" style={{ textWrap: 'pretty' }}>{o.sub}</span> : null}
                {o.price ? <span className="small" style={{ marginTop: 4 }}>{o.price}</span> : null}
                {o.disabled && o.reason ? <span className="xxs" style={{ color: 'var(--err)', marginTop: 4 }}>{o.reason}</span> : null}
              </span>
            </button>
          ))}
        </div>
      );
      break;
    case 'qty':
      control = (
        <div className="stack g10">
          <div style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${hasErr ? 'var(--err-strong)' : 'var(--input)'}`, background: 'var(--surface)', borderRadius: 2, maxWidth: 320 }}>
            <input id={id} type="text" inputMode="numeric" value={v == null ? '' : String(v)} aria-invalid={hasErr} aria-describedby={describedBy} onChange={(e) => p.onChange?.(e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: '13px 14px', border: 'none', background: 'transparent', font: 'inherit', fontSize: 18, color: 'var(--ink)' }} />
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderLeft: '1px solid var(--hair)', color: 'var(--body)', fontSize: 14 }}>{p.unit}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} aria-label="Quick quantities">
            {(p.presets || []).map((n) => (
              <button key={n} type="button" className={'pillbtn' + (String(v) === String(n) ? ' on' : '')} aria-pressed={String(v) === String(n)} onClick={() => p.onChange?.(String(n))}>{n}</button>
            ))}
          </div>
        </div>
      );
      break;
    case 'file':
      control = (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, border: `1px dashed ${hasErr ? 'var(--err-strong)' : 'var(--input)'}`, background: 'var(--surface)', padding: '14px 16px', borderRadius: 2 }}>
          <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/heic" aria-describedby={describedBy} style={{ font: 'inherit', fontSize: 14, maxWidth: '100%' }} onChange={(e) => p.onFile?.(e.target.files?.[0] || null)} />
          <span className="xs muted">{p.fileName || 'JPG, PNG, WEBP or HEIC, up to 5 MB'}</span>
        </div>
      );
      break;
    case 'toggle':
      control = (
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, cursor: 'pointer', fontSize: 15 }}>
          <input id={id} type="checkbox" checked={!!v} onChange={(e) => p.onChange?.(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--rose)', margin: 0 }} />
          <span>{p.label}</span>
        </label>
      );
      break;
    case 'addons':
      control = (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 190px), 1fr))', gap: 10 }}>
          {(p.items || []).map((a) => (
            <div key={a.id} style={{ border: `1px solid ${a.qty > 0 ? 'var(--ink)' : 'var(--hair)'}`, background: a.qty > 0 ? 'var(--soft)' : 'var(--surface)', borderRadius: 2, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, opacity: a.disabled && !a.qty ? 0.6 : 1 }}>
              <span className="stack g4">
                {a.cat ? <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--sage)' }}>{a.cat}</span> : null}
                <span style={{ fontSize: 15, lineHeight: 1.3 }}>{a.name}</span>
                <span className="small muted">{a.price}</span>
              </span>
              {a.disabled ? <span className="xxs" style={{ color: 'var(--err)' }}>{a.reason || 'Currently unavailable'}</span> : null}
              {a.qty === 0 && !a.disabled ? <button type="button" className="btn btn-outline btn-xs" style={{ alignSelf: 'flex-start' }} aria-label={`Add ${a.name}`} onClick={() => p.onQty?.(a.id, 1)}>+ Add</button> : null}
              {a.qty > 0 ? (
                <div className="stepper-qty" style={{ alignSelf: 'flex-start' }}>
                  <button type="button" style={{ width: 40, height: 40 }} aria-label={`One fewer ${a.name}`} onClick={() => p.onQty?.(a.id, a.qty - 1)}>−</button>
                  <span aria-live="polite" style={{ minWidth: 28 }}>{a.qty}</span>
                  <button type="button" style={{ width: 40, height: 40 }} aria-label={`One more ${a.name}`} onClick={() => p.onQty?.(a.id, a.qty + 1)}>+</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      );
      break;
    case 'rows': {
      const rows: any[] = Array.isArray(v) ? v : [];
      const set = (nx: any[]) => p.onChange?.(nx);
      control = (
        <div className="stack g8">
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {(p.cols || []).map((c) => (
                <input key={c.k} type={c.type || 'text'} value={r[c.k] == null ? '' : String(r[c.k])} placeholder={c.ph} aria-label={c.ph}
                  style={{ flex: c.flex || 1, minWidth: 80, padding: '10px 12px', border: '1px solid var(--input)', background: 'var(--surface)', borderRadius: 2, font: 'inherit', fontSize: 15, color: 'var(--ink)' }}
                  onChange={(e) => { const nx = rows.slice(); nx[i] = { ...nx[i], [c.k]: e.target.value }; set(nx); }} />
              ))}
              {p.toggleKey ? (
                <label className="xs" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={r[p.toggleKey] !== false} style={{ accentColor: 'var(--rose)', width: 18, height: 18 }} onChange={(e) => { const nx = rows.slice(); nx[i] = { ...nx[i], [p.toggleKey!]: e.target.checked }; set(nx); }} />
                  {p.toggleLabel}
                </label>
              ) : null}
              <button type="button" className="btn btn-outline btn-xs" style={{ borderColor: 'var(--input)', color: 'var(--body)' }} aria-label="Remove row" onClick={() => set(rows.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-xs" style={{ alignSelf: 'flex-start' }} onClick={() => set([...rows, { ...(p.blank || {}) }])}>{p.addLabel || '+ Add row'}</button>
        </div>
      );
      break;
    }
    case 'info':
      control = <div className={'note' + (p.tone ? ' ' + p.tone : '')} style={{ fontSize: 14, lineHeight: 1.55, padding: '12px 14px' }}>{p.text || p.label}</div>;
      break;
  }

  return (
    <div className="field">
      {showLabel ? (
        <label className="label" htmlFor={id}>
          <span>{p.label}{p.req ? <span className="req"> *</span> : null}</span>
          {p.maxLen ? <span className="counter">{String(v || '').length} / {p.maxLen}</span> : null}
        </label>
      ) : null}
      {control}
      {p.hint ? <span id={hintId} className="hint">{p.hint}</span> : null}
      {hasErr ? <span id={errId} role="alert" className="error">{p.error}</span> : null}
    </div>
  );
}
