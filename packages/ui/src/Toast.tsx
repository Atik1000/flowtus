'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastState { text: string; href?: string; link?: string }
const ToastContext = createContext<(text: string, href?: string, link?: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((text: string, href?: string, link?: string) => {
    clearTimeout(timer.current);
    setToast({ text, href, link });
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast.text}</span>
          {toast.href && toast.link ? <a href={toast.href}>{toast.link}</a> : null}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
