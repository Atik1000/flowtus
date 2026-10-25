'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { configKey, issueText, priceCart, priceLine, rid, type CartLine, type Db, type PricedCart } from '@flowtus/core';
import { LangProvider, ToastProvider, useToast, type Lang } from '@flowtus/ui';
import { toDb } from '@/lib/catalogue';
import type { PublicCatalogue } from '@/lib/types';

/* ---------- Catalogue ---------- */
interface CatCtx { cat: PublicCatalogue; db: Db; refresh: () => Promise<void> }
const CatalogueContext = createContext<CatCtx>(null as unknown as CatCtx);
export const useCatalogue = () => useContext(CatalogueContext);

function CatalogueProvider({ initial, children }: { initial: PublicCatalogue; children: ReactNode }) {
  const [cat, setCat] = useState(initial);
  useEffect(() => setCat(initial), [initial]);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/catalogue', { cache: 'no-store' });
      if (r.ok) setCat(await r.json());
    } catch {
      /* keep the last good catalogue */
    }
  }, []);
  // Prices and availability can change while a tab stays open: re-read on focus and every minute.
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(refresh, 60_000);
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(t); };
  }, [refresh]);
  const db = useMemo(() => toDb(cat), [cat]);
  const value = useMemo(() => ({ cat, db, refresh }), [cat, db, refresh]);
  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

/* ---------- Cart (client-only state, survives refresh) ---------- */
const CART_KEY = 'flowtus-v2-cart';
interface CartCtx {
  cart: CartLine[];
  ready: boolean;
  setCart: (c: CartLine[]) => void;
  addLine: (line: CartLine) => boolean;
  priced: PricedCart;
  count: number;
}
const CartContext = createContext<CartCtx>(null as unknown as CartCtx);
export const useCart = () => useContext(CartContext);

function CartProvider({ children }: { children: ReactNode }) {
  const { db } = useCatalogue();
  const toast = useToast();
  const [cart, setCartState] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (Array.isArray(raw)) setCartState(raw);
    } catch { /* unreadable cart: start empty */ }
    setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === CART_KEY && e.newValue) { try { setCartState(JSON.parse(e.newValue)); } catch { /* ignore */ } } };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setCart = useCallback((c: CartLine[]) => {
    setCartState(c);
    cartRef.current = c;
    try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch { toast('Could not save in this browser. Your cart may be lost on refresh.'); }
  }, [toast]);

  const addLine = useCallback((line: CartLine): boolean => {
    const pr = priceLine(db, line);
    if (pr.blocking) { toast(issueText(pr.issues[0])); return false; }
    const next = cartRef.current.map((l) => ({ ...l }));
    const k = configKey(line);
    if (line.editKey) {
      const i = next.findIndex((l) => l.key === line.editKey);
      if (i >= 0) { const { editKey: _e, ...rest } = line; next[i] = { ...rest, key: line.editKey, snapUnit: pr.unit }; setCart(next); return true; }
    }
    const ex = next.find((l) => configKey(l) === k && l.key !== line.editKey);
    if (ex) {
      if (+ex.qty + +line.qty > pr.p!.maxQty) { toast(`You can order up to ${pr.p!.maxQty} of ${pr.p!.name}.`); return false; }
      ex.qty = +ex.qty + +line.qty;
      ex.snapUnit = pr.unit;
    } else {
      const { editKey: _e, ...rest } = line;
      next.push({ ...rest, key: rid(8), snapUnit: pr.unit, qty: +line.qty });
    }
    setCart(next);
    return true;
  }, [db, setCart, toast]);

  const priced = useMemo(() => priceCart(db, cart, null), [db, cart]);
  const value = useMemo(() => ({ cart, ready, setCart, addLine, priced, count: priced.count }), [cart, ready, setCart, addLine, priced]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/* ---------- Everything ---------- */
export function Providers({ initialLang, catalogue, children }: { initialLang: Lang; catalogue: PublicCatalogue; children: ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang);
  useEffect(() => setLangState(initialLang), [initialLang]);
  const setLang = useCallback((l: Lang) => {
    document.cookie = `ft-lang=${l}; path=/; max-age=31536000; samesite=lax`;
    setLangState(l);
    router.refresh(); // server components re-render in the new language
  }, [router]);
  return (
    <LangProvider lang={lang} onChange={setLang}>
      <ToastProvider>
        <CatalogueProvider initial={catalogue}>
          <CartProvider>{children}</CartProvider>
        </CatalogueProvider>
      </ToastProvider>
    </LangProvider>
  );
}
