'use client';
import { useCallback, useRef, useState } from 'react';
import { ApiError, newIdempotencyKey } from '@flowtus/ui';
import type { Tone } from '@flowtus/ui';

export interface BannerState { text: string; tone: Tone; actions?: { label: string; onClick: () => void }[] }

/** Submit helper: one idempotency key per attempt series (a retry returns the original record), busy state, and the standard error banners.
 *  On a network failure the form keeps its data and says nothing was saved. */
export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const key = useRef<string | null>(null);

  const run = useCallback(async <T,>(call: (idem: string) => Promise<T>, h: { onOk: (r: T) => void; onErrors?: (e: Record<string, string>) => void; onConflict?: (e: ApiError) => boolean | void }) => {
    if (busy) return;
    setBusy(true);
    setBanner(null);
    key.current = key.current || newIdempotencyKey();
    try {
      const r = await call(key.current);
      h.onOk(r);
    } catch (e: any) {
      if (!(e instanceof ApiError)) { setBanner({ text: 'Something went wrong. Please try again.', tone: 'error' }); return; }
      if (e.status === 422 && e.errors) { h.onErrors?.(e.errors); setBanner({ text: 'Please check the highlighted fields.', tone: 'error' }); try { window.scrollTo({ top: 0 }); } catch { /* noop */ } return; }
      if (e.status === 409 && h.onConflict?.(e)) return;
      setBanner({ text: e.network ? 'We could not save this because of a connection problem. Nothing was submitted and your details are still here. Please try again.' : e.message, tone: 'error' });
    } finally {
      setBusy(false);
    }
  }, [busy]);

  /** Call after success so the next, different submission gets a fresh key. */
  const done = useCallback(() => { key.current = null; }, []);
  return { busy, banner, setBanner, run, done };
}
