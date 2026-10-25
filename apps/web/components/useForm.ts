'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

const DKEY = 'flowtus-v2-drafts';

function readDrafts(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(DKEY) || '{}'); } catch { return {}; }
}

/** Form state keyed by form id. With `persist`, unsent form data survives a refresh (never a password or payment reference). */
export function useForm<T extends Record<string, any>>(fid: string, initial: T = {} as T, opts: { persist?: boolean } = {}) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const loaded = useRef(false);

  useEffect(() => {
    if (opts.persist) {
      const d = readDrafts()[fid];
      if (d && typeof d === 'object') setValues({ ...initial, ...d });
    }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fid]);

  useEffect(() => {
    if (!opts.persist || !loaded.current) return;
    const t = setTimeout(() => {
      try { const all = readDrafts(); all[fid] = values; localStorage.setItem(DKEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
    }, 150);
    return () => clearTimeout(t);
  }, [values, fid, opts.persist]);

  const set = useCallback((k: string, v: any) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));
  }, []);
  const setMany = useCallback((o: Partial<T>, replace = false) => {
    setValues((s) => (replace ? ({ ...o } as T) : { ...s, ...o }));
    setErrors((e) => { const n = { ...e }; Object.keys(o).forEach((k) => delete n[k]); return n; });
  }, []);
  const reset = useCallback((to: T = initial) => {
    setValues(to);
    setErrors({});
    if (opts.persist) { try { const all = readDrafts(); delete all[fid]; localStorage.setItem(DKEY, JSON.stringify(all)); } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fid, opts.persist]);

  return { v: values, set, setMany, reset, errors, setErrors };
}
export type FormApi<T extends Record<string, any> = Record<string, any>> = ReturnType<typeof useForm<T>>;

/** Writes a form draft directly (used by "Edit gift" in the cart to reopen the builder). */
export function writeDraft(fid: string, value: unknown) {
  try { const all = readDrafts(); all[fid] = value; localStorage.setItem(DKEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
}
