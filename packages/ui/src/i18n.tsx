'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { STATUS_BN, TONE } from '@flowtus/core';

import { pick, type Bi, type Lang } from './lang';

interface Ctx {
  lang: Lang;
  t: (x: Bi | undefined | null) => string;
  /** Localised status label. */
  sl: (status: string) => string;
  setLang: (l: Lang) => void;
}
const LangContext = createContext<Ctx>({ lang: 'en', t: (x) => pick('en', x), sl: (s) => s, setLang: () => {} });

export function LangProvider({ lang, onChange, children }: { lang: Lang; onChange?: (l: Lang) => void; children: ReactNode }) {
  const value = useMemo<Ctx>(
    () => ({ lang, t: (x) => pick(lang, x), sl: (s) => (lang === 'bn' ? STATUS_BN[s] || s : s), setLang: onChange || (() => {}) }),
    [lang, onChange],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
export const useLang = () => useContext(LangContext);

/** Status pill coloured by the shared TONE() map. */
export function StatusPill({ status, label, className = '' }: { status: string; label?: string; className?: string }) {
  const { sl } = useLang();
  const tone = TONE(status);
  return (
    <span className={`pill ${className}`} style={{ background: tone.bg, color: tone.fg }}>
      {label ?? sl(status)}
    </span>
  );
}
