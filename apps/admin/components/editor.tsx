'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Banner } from '@flowtus/ui';
import { ApiError } from '@flowtus/ui';
import { useToast } from '@flowtus/ui';

/** Save helper for editors: shows field errors from the server under the fields, and a banner. */
export function useSave() {
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (fn: () => Promise<any>, ok: string): Promise<any> => {
    setBusy(true); setBanner(''); setErrors({});
    try { const r = await fn(); toast(ok); return r ?? true; }
    catch (e) {
      const err = e as ApiError;
      if (err.errors) setErrors(err.errors);
      setBanner(err.message);
      try { window.scrollTo({ top: 0 }); } catch { /* noop */ }
      return false;
    } finally { setBusy(false); }
  };
  return { errors, banner, busy, save, clear: () => setErrors({}), err: (k: string) => errors[k] || '' };
}

export const EditorShell = ({ back, title, banner, children, onSave, busy, extra }: { back: string; title: string; banner?: string; children: ReactNode; onSave: () => void; busy: boolean; extra?: ReactNode }) => (
  <>
    <Link href={back} className="small">← Back</Link>
    <h1 className="display" style={{ fontSize: 36 }}>{title}</h1>
    {banner ? <Banner tone="error">{banner}</Banner> : null}
    {children}
    <div className="row wrap g10"><button type="button" className="btn btn-rose" disabled={busy} onClick={onSave}>{busy ? 'Saving…' : 'Save changes'}</button>{extra}</div>
  </>
);
export const FieldSet = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className="fieldset"><legend>{title}</legend><div className="form-grid">{children}</div></fieldset>
);
export const Full = ({ children }: { children: ReactNode }) => <div className="full">{children}</div>;
