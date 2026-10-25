'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** Fades its content up when it scrolls into view. Content already on screen at load is never hidden, and without JS nothing is hidden. */
export function Reveal({ children, className = '', style, stagger = false, delay = 0 }: { children: ReactNode; className?: string; style?: CSSProperties; stagger?: boolean; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState<'init' | 'hide' | 'in'>('init');
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setS('in'); return; }
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) { setS('in'); return; }
    setS('hide');
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setS('in'); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${stagger ? 'rv-stagger' : 'rv'} ${s === 'hide' ? 'hide' : ''} ${className}`} style={delay ? { ...style, transitionDelay: delay + 'ms' } : style}>
      {children}
    </div>
  );
}
