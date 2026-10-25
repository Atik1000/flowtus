'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, Banner, Field, ToastProvider, api, useToast, type ApiOptions } from '@flowtus/ui';

export interface Me { name: string; role: 'owner' | 'staff' }
const MeContext = createContext<Me>({ name: '', role: 'staff' });
export const useMe = () => useContext(MeContext);

/** Admin API call: same-origin /api/admin/*, with the CSRF header the server requires for cookie-authenticated writes. */
export const adm = <T = any,>(path: string, o: ApiOptions = {}) => api<T>('/admin' + path, { ...o, admin: true });

/** Loads data and exposes reload; 401 sends the user back to sign-in. */
export function useLoad<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!path) return;
    try { setData(await adm<T>(path)); setError(''); }
    catch (e) { if (e instanceof ApiError && e.status === 401) window.location.reload(); setError((e as Error).message); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}

/** Runs an action, toasts the outcome and reloads. */
export function useAct(reload: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    act: async (fn: () => Promise<any>, ok?: string) => {
      setBusy(true);
      try { await fn(); if (ok) toast(ok); reload(); return true; }
      catch (e) { toast((e as Error).message); return false; }
      finally { setBusy(false); }
    },
  };
}

export const NAV: [string, string, boolean?][] = [
  ['/', 'Overview'], ['/orders', 'Orders'], ['/requests', 'Requests & bookings'], ['/calendar', 'Calendar & availability'], ['/products', 'Products'],
  ['/custom', 'Custom catalogue'], ['/services', 'Services'], ['/delivery', 'Delivery & areas'], ['/settings', 'Settings', true], ['/audit', 'Audit log'], ['/tests', 'Test report'],
];

function Login({ onDone }: { onDone: (m: Me) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr('');
    try { onDone(await api<Me>('/auth/login', { body: { email, password } })); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ minHeight: '100vh', background: 'var(--admin-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="card" style={{ width: '100%', maxWidth: 420, padding: 36, gap: 18 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.3em' }}>FLOWTUS</span>
        <h1 className="display" style={{ fontSize: 32 }}>Admin sign in</h1>
        {err ? <div role="alert" className="note error" style={{ fontSize: 14, padding: '10px 12px' }}>{err}</div> : null}
        <Field type="email" name="email" label="Email" ac="username" value={email} onChange={setEmail} />
        <Field type="password" name="password" label="Password" ac="current-password" value={password} onChange={setPassword} />
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a href={process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000'} className="small" style={{ textAlign: 'center' }}>Back to the store</a>
      </form>
    </div>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const path = usePathname();
  useEffect(() => { api<Me>('/auth/me', { admin: true }).then(setMe).catch(() => setMe(null)); }, []);
  if (me === undefined) return <div className="loading" role="status"><b>FLOWTUS</b><span className="small muted">Loading…</span></div>;
  if (!me) return <Login onDone={setMe} />;
  const signOut = async () => { await api('/auth/logout', { method: 'POST', body: {}, admin: true }).catch(() => {}); setMe(null); };
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';
  return (
    <MeContext.Provider value={me}>
      <div className="admin-shell">
        <aside className="admin-side">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '0.28em', padding: '0 12px' }}>FLOWTUS</span>
          <span style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--rose-tint)', padding: '0 12px 6px' }}>ADMIN</span>
          <span className="small" style={{ color: '#d9c8cf', padding: '0 12px 16px' }}>{me.name} · {me.role === 'owner' ? 'Owner' : 'Staff'}</span>
          <nav aria-label="Admin" className="stack" style={{ gap: 2 }}>
            {NAV.filter(([, , ownerOnly]) => !ownerOnly || me.role === 'owner').map(([href, label]) => (
              <Link key={href} href={href} className={(href === '/' ? path === '/' : path === href || path.startsWith(href + '/')) ? 'on' : ''}>{label}</Link>
            ))}
          </nav>
          <div className="stack g8 small" style={{ marginTop: 'auto', padding: '16px 12px 0' }}>
            <a href={storeUrl} style={{ color: 'var(--soft)' }}>View store</a>
            <button type="button" onClick={signOut} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--rose-tint)', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 14 }}>Sign out</button>
          </div>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </MeContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider><AdminGate>{children}</AdminGate></ToastProvider>;
}

/* ---------- Small shared pieces ---------- */
export const Title = ({ children, actions }: { children: ReactNode; actions?: ReactNode }) => (
  <div className="row between wrap g12"><h1 className="admin-title">{children}</h1>{actions}</div>
);
export const Panel = ({ title, children }: { title?: string; children: ReactNode }) => (
  <div className="panel">{title ? <h2 className="h4">{title}</h2> : null}{children}</div>
);
export const Kv = ({ k, v, w = 120 }: { k: string; v: ReactNode; w?: number }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `${w}px minmax(0, 1fr)`, gap: 12, fontSize: 14, borderTop: '1px solid var(--soft-2)', paddingTop: 6 }}><span className="muted">{k}</span><span>{v}</span></div>
);
export const Loading = ({ error }: { error?: string }) => error ? <Banner tone="error">{error}</Banner> : <span className="muted">Loading…</span>;
export const stamp = (ts: number) => new Date(ts).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Notes / messages / history blocks shared by order and request detail. */
export function Thread({ title, list, field }: { title: string; list: { at: number; text: string; by?: string; from?: string }[]; field?: ReactNode }) {
  return (
    <Panel title={title}>
      {field}
      {list.slice().reverse().map((n, i) => <div key={i} style={{ fontSize: 14, borderTop: '1px solid var(--soft-2)', paddingTop: 6 }}><span className="xxs muted">{stamp(n.at)} · {n.by || n.from}</span><br />{n.text}</div>)}
    </Panel>
  );
}
export const History = ({ list }: { list: { at: number; text: string; by: string }[] }) => (
  <Panel title="History">{list.slice().reverse().map((h, i) => <div key={i} className="xs" style={{ borderTop: '1px solid var(--soft-2)', paddingTop: 6 }}><span className="muted">{stamp(h.at)} · {h.by}</span> — {h.text}</div>)}</Panel>
);
