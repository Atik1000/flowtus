import type { Db, Settings } from '@flowtus/core';
import { currentQuote, expectedAmount } from '@flowtus/core';

/** Settings safe for anonymous visitors: payment numbers are NOT included (they appear only on an order or an approved quote). */
export function publicSettings(s: Settings) {
  return {
    announcement: s.announcement,
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    instagram: s.instagram,
    facebook: s.facebook,
    pay: { cod: { enabled: s.pay.cod.enabled }, bkash: { enabled: s.pay.bkash.enabled }, nagad: { enabled: s.pay.nagad.enabled } },
    policies: s.policies,
    faqs: s.faqs,
    faqApproved: s.faqApproved,
  };
}

export function publicCatalogue(db: Db) {
  return {
    products: db.products,
    custom: db.custom,
    services: db.services,
    occasions: db.occasions,
    areas: db.areas,
    delivery: db.delivery,
    blocks: db.blocks.map((b) => ({ date: b.date, scope: b.scope, slot: b.slot, reason: b.reason })),
    settings: publicSettings(db.settings),
  };
}

/** Payment instructions, revealed only for a placed order or an approved quote that has something to pay. */
function payInfo(rec: any, s: Settings) {
  const due = expectedAmount(rec);
  const reveal = due != null;
  return {
    cod: { enabled: s.pay.cod.enabled },
    bkash: { enabled: s.pay.bkash.enabled, number: reveal ? s.pay.bkash.number : '' },
    nagad: { enabled: s.pay.nagad.enabled, number: reveal ? s.pay.nagad.number : '' },
  };
}

/** What a customer may see of an order: no internal notes, no internal history, no database id. */
export function publicOrder(o: any, s: Settings) {
  const { notes: _n, history: _h, id: _i, ...rest } = o;
  return { ...rest, payInfo: payInfo(o, s) };
}
export function publicRequest(r: any, s: Settings) {
  const { notes: _n, history: _h, id: _i, team: _t, ...rest } = r;
  const q = currentQuote(r);
  return { ...rest, payInfo: payInfo(r, s), hasApprovedQuote: !!q && q.approval === 'approved' };
}
