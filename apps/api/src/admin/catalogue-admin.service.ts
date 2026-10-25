import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Actor, DEPTS, FIELD_DEFS, Settings, fmt, isWhole, normPhone, rid, validEmail } from '@flowtus/core';
import { StoreService } from '../common/store.service';

const str = (v: unknown, max = 2000) => String(v ?? '').slice(0, max);
/** Blank string or null → fallback; otherwise a number (NaN when it is not numeric). */
const num = (v: unknown, def: number | null): number | null => {
  const s = String(v ?? '').trim();
  if (s === '') return def;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};
const fail = (errors: Record<string, string>): never => {
  throw new UnprocessableEntityException({ message: 'Please check the highlighted fields.', errors });
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

@Injectable()
export class CatalogueAdminService {
  constructor(private store: StoreService) {}

  private async audit(actor: Actor, ref: string, action: string) {
    await this.store.prisma.auditEntry.create({ data: { by: `${actor.name} (${actor.role})`, ref, action } });
  }

  /* ---------- Products ---------- */
  async listProducts() {
    return (await this.store.catalogue()).products;
  }
  async getProduct(id: string) {
    const p = (await this.store.catalogue()).products.find((x) => x.id === id);
    if (!p) throw new NotFoundException('Product not found.');
    return p;
  }
  async saveProduct(actor: Actor, id: string | null, b: any) {
    const e: Record<string, string> = {};
    const name = str(b?.name, 160).trim();
    if (!name) e.name = 'Enter a name.';
    if (!DEPTS[b?.dept]) e.dept = 'Choose a department.';
    else if (!DEPTS[b.dept].cats.some((c) => c[0] === b.cat)) e.cat = 'Choose a category in this department.';
    const vars = (Array.isArray(b?.variants) ? b.variants : []).filter((x: any) => String(x?.name || '').trim());
    if (!vars.length) e.variants = 'Add at least one size or variant.';
    vars.forEach((x: any) => {
      const n = num(x.price, null);
      if (n !== null && (isNaN(n) || n < 0)) e.variants = 'Prices must be numbers of 0 or more. Leave blank for price on request.';
    });
    const maxQty = num(b?.maxQty, 10) as number;
    const leadDays = num(b?.leadDays, 0) as number;
    if (!isWhole(maxQty) || maxQty < 1) e.maxQty = 'Whole number from 1.';
    if (!isWhole(leadDays)) e.leadDays = 'Whole number of days.';
    if (Object.keys(e).length) fail(e);

    const data = {
      name, dept: b.dept, cat: b.cat, short: str(b.short, 400), description: str(b.description), composition: str(b.composition, 600), care: str(b.care, 600),
      occ: (Array.isArray(b.occ) ? b.occ : []).map((x: any) => str(x, 40)),
      variants: vars.map((x: any, i: number) => ({ id: str(x.id, 40) || 'v' + i + rid(3).toLowerCase(), name: str(x.name, 80), price: num(x.price, null), available: x.available !== false })),
      maxQty, leadDays, available: !!b.available, featured: !!b.featured, addons: !!b.addons, builder: !!b.builder, builderExtra: !!b.builderExtra, wrap: !!b.wrap, archived: !!b.archived,
    };
    if (id) {
      const before = await this.store.prisma.product.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Product not found.');
      await this.store.prisma.product.update({ where: { id }, data: data as any });
      const changed = JSON.stringify(before.variants) !== JSON.stringify(data.variants);
      await this.audit(actor, id, 'Updated product' + (changed ? ' · prices/variants changed' : '') + (data.archived ? ' · archived' : ''));
      return this.getProduct(id);
    }
    let newId = slug(name) || rid(6).toLowerCase();
    if (await this.store.prisma.product.findUnique({ where: { id: newId } })) newId += '-' + rid(3).toLowerCase();
    const count = await this.store.prisma.product.count();
    await this.store.prisma.product.create({ data: { ...data, id: newId, slug: newId, img: null, sample: false, sort: count } as any });
    await this.audit(actor, newId, 'Created product');
    return this.getProduct(newId);
  }

  /* ---------- Custom catalogue ---------- */
  async listCustom() {
    return (await this.store.catalogue()).custom;
  }
  async getCustom(id: string) {
    const c = (await this.store.catalogue()).custom.find((x) => x.id === id);
    if (!c) throw new NotFoundException('Custom item not found.');
    return c;
  }
  async saveCustom(actor: Actor, id: string | null, b: any) {
    const e: Record<string, string> = {};
    const name = str(b?.name, 160).trim();
    if (!name) e.name = 'Enter a name.';
    const up = num(b?.unitPrice, null);
    const mn = num(b?.min, 1) as number;
    const mx = num(b?.max, 100) as number;
    const ml = num(b?.multiple, 1) as number;
    const ld = num(b?.leadDays, 1) as number;
    if (up !== null && (isNaN(up) || up < 0)) e.unitPrice = 'Number of 0 or more, or blank for price on request.';
    if (!isWhole(mn) || mn < 1) e.min = 'Whole number from 1.';
    if (!isWhole(mx) || mx < mn) e.max = 'Must be at least the minimum.';
    if (!isWhole(ml) || ml < 1) e.multiple = 'Whole number from 1.';
    else if (isWhole(mn) && mn % ml) e.min = 'Minimum must be a multiple of ' + ml + '.';
    if (!isWhole(ld)) e.leadDays = 'Whole number of days.';
    const presets = (Array.isArray(b?.presets) ? b.presets : String(b?.presets || '').split(',')).map((x: any) => String(x).trim()).filter(Boolean).map(Number);
    if (presets.some((x: number) => !isWhole(x))) e.presets = 'Comma-separated whole numbers.';
    if (!['fixed', 'confirm', 'quote'].includes(b?.priceMode)) e.priceMode = 'Choose how the price is handled.';
    if (Object.keys(e).length) fail(e);
    const data = { name, bn: str(b.bn, 160), type: str(b.type || 'Flower', 40), unit: str(b.unit || 'stem', 40), unitPrice: up, priceMode: b.priceMode, min: mn, max: mx, multiple: ml, presets, available: !!b.available, seasonal: !!b.seasonal, leadDays: ld };
    if (id) {
      const before = await this.store.prisma.customItem.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Custom item not found.');
      await this.store.prisma.customItem.update({ where: { id }, data });
      await this.audit(actor, id, 'Updated custom item' + (before.unitPrice !== up ? ` · unit price ${before.unitPrice == null ? 'none' : fmt(before.unitPrice)} → ${up == null ? 'none' : fmt(up)}` : ''));
      return this.getCustom(id);
    }
    const newId = slug(name) + '-' + rid(3).toLowerCase();
    await this.store.prisma.customItem.create({ data: { ...data, id: newId, sort: await this.store.prisma.customItem.count() } });
    await this.audit(actor, newId, 'Created custom item');
    return this.getCustom(newId);
  }

  /* ---------- Services (edited, not created: each has its own form config) ---------- */
  async listServices() {
    return (await this.store.catalogue()).services;
  }
  async getService(id: string) {
    const s = (await this.store.catalogue()).services.find((x) => x.id === id);
    if (!s) throw new NotFoundException('Service not found.');
    return s;
  }
  async saveService(actor: Actor, id: string, b: any) {
    const existing = await this.getService(id);
    const db = await this.store.catalogue();
    const e: Record<string, string> = {};
    const ranges: Record<string, [number, number]> = { depositPct: [0, 100], leadDays: [0, 365], maxDays: [1, 730], durationHrs: [1, 24] };
    Object.entries(ranges).forEach(([k, [lo, hi]]) => {
      const n = num(b?.[k], NaN) as number;
      if (!isWhole(n) || n < lo || n > hi) e[k] = `Whole number ${lo}–${hi}.`;
    });
    const h0 = num(b?.hours?.[0], NaN) as number;
    const h1 = num(b?.hours?.[1], NaN) as number;
    if (!isWhole(h0) || h0 < 0 || h0 > 23) e.h0 = 'Whole number 0–23.';
    if (!isWhole(h1) || h1 < 1 || h1 > 24) e.h1 = 'Whole number 1–24.';
    if (!e.h0 && !e.h1 && !e.durationHrs && h1 - h0 < +b.durationHrs) e.h1 = 'Hours must fit at least one booking.';
    const cap = num(b?.capacity, null);
    if (cap !== null && (!isWhole(cap) || cap < 1)) e.capacity = 'Whole number from 1, or blank for no limit.';
    const fp = num(b?.fromPrice, null);
    if (fp !== null && (isNaN(fp) || fp < 0)) e.fromPrice = 'Number, or blank.';
    const pk = (Array.isArray(b?.packages) ? b.packages : []).filter((x: any) => String(x?.name || '').trim());
    if (pk.some((x: any) => isNaN(num(x.price, NaN) as number))) e.packages = 'Every package needs a price.';
    if (b?.priceModel === 'package' && !pk.length) e.packages = 'Add at least one package, or change the price model.';
    if (!['package', 'from', 'quote'].includes(b?.priceModel)) e.priceModel = 'Choose a price model.';
    const coverage = (Array.isArray(b?.coverage) ? b.coverage : []).filter((c: string) => db.areas.some((a) => a.id === c));
    if (!coverage.length) e.coverage = 'Choose at least one area.';
    if (Object.keys(e).length) fail(e);

    const fields = (Array.isArray(b.fields) ? b.fields : []).filter((k: string) => FIELD_DEFS[k]);
    ['name', 'phone'].forEach((k) => { if (!fields.includes(k)) fields.push(k); });
    const req = Array.from(new Set((Array.isArray(b.req) ? b.req : []).filter((k: string) => fields.includes(k)).concat(['name', 'phone'])));
    const lines = (v: unknown) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => str(x, 300).trim()).filter(Boolean);
    await this.store.prisma.service.update({
      where: { id },
      data: {
        name: [str(b.name?.[0], 160), str(b.name?.[1], 160)] as any, short: str(b.short, 600), active: !!b.active, priceModel: b.priceModel,
        packages: pk.map((x: any, i: number) => ({ id: str(x.id, 40) || 'pk' + i, name: str(x.name, 120), price: +x.price, includes: str(x.includes, 300) })) as any,
        fromPrice: fp, depositPct: +b.depositPct, leadDays: +b.leadDays, maxDays: +b.maxDays, hours: [h0, h1], durationHrs: +b.durationHrs, capacity: cap,
        coverage, partner: !!b.partner, partnerAvailable: !!b.partnerAvailable, included: lines(b.included), excluded: lines(b.excluded), cancellation: str(b.cancellation, 1500), fields, req: req as string[],
      },
    });
    await this.audit(actor, id, 'Updated service' + (b.active ? '' : ' · disabled') + (existing.active !== !!b.active ? ' · availability changed' : ''));
    return this.getService(id);
  }

  /* ---------- Delivery areas, windows and rules ---------- */
  async getDelivery() {
    const db = await this.store.catalogue();
    return { areas: db.areas, ...db.delivery };
  }
  async saveDelivery(actor: Actor, b: any) {
    const e: Record<string, string> = {};
    const areas = (Array.isArray(b?.areas) ? b.areas : []).filter((x: any) => String(x?.name?.[0] ?? x?.name ?? '').trim());
    const slots = (Array.isArray(b?.slots) ? b.slots : []).filter((x: any) => String(x?.label || '').trim());
    if (!areas.length) e.areas = 'Keep at least one delivery area.';
    if (areas.some((x: any) => isNaN(num(x.fee, NaN) as number) || +x.fee < 0)) e.areas = 'Every area needs a fee of 0 or more.';
    if (slots.some((x: any) => !isWhole(x.start) || +x.start > 23 || !isWhole(x.cap) || +x.cap < 1)) e.slots = 'Start hour 0–23 and capacity from 1.';
    (['cutoffHour', 'leadHours', 'maxDaysAhead', 'customMaxDays'] as const).forEach((k) => { if (!isWhole(b?.[k])) e[k] = 'Whole number.'; });
    if (Object.keys(e).length) fail(e);
    const areaName = (x: any): [string, string] => (Array.isArray(x.name) ? [str(x.name[0], 80), str(x.name[1] || x.name[0], 80)] : [str(x.name, 80), str(x.bn || x.name, 80)]);
    await this.store.run(async (tx) => {
      const ids = areas.map((x: any, i: number) => str(x.id, 60) || slug(areaName(x)[0]) || 'area' + i);
      await tx.area.deleteMany({ where: { id: { notIn: ids } } });
      for (const [i, x] of areas.entries()) {
        const data = { name: areaName(x) as any, fee: +x.fee, delivery: !!x.delivery, sort: i };
        await tx.area.upsert({ where: { id: ids[i] }, update: data, create: { id: ids[i], ...data } });
      }
      const services = await tx.service.findMany();
      for (const s of services) {
        const coverage = s.coverage.filter((c) => ids.includes(c));
        if (coverage.length !== s.coverage.length) await tx.service.update({ where: { id: s.id }, data: { coverage } });
      }
      const value = {
        slots: slots.map((x: any, i: number) => ({ id: str(x.id, 40) || 'slot' + i, label: str(x.label, 40), start: +x.start, cap: +x.cap, enabled: x.enabled !== false })),
        sameDay: !!b.sameDay, cutoffHour: +b.cutoffHour, leadHours: +b.leadHours, maxDaysAhead: +b.maxDaysAhead, customMaxDays: +b.customMaxDays,
      };
      await tx.appSetting.upsert({ where: { key: 'delivery' }, update: { value }, create: { key: 'delivery', value } });
    });
    await this.audit(actor, 'delivery', 'Updated delivery areas, fees and windows');
    return this.getDelivery();
  }

  /* ---------- Settings (owner only) ---------- */
  async getSettings(): Promise<Settings> {
    return (await this.store.catalogue()).settings;
  }
  async saveSettings(actor: Actor, b: any) {
    if (actor.role !== 'owner') throw new ForbiddenException('Only the owner can change payment and policy settings.');
    const cur = await this.getSettings();
    const e: Record<string, string> = {};
    if (b?.phone && !normPhone(b.phone)) e.phone = 'Enter a valid Bangladeshi mobile number.';
    if (b?.whatsapp && !normPhone(b.whatsapp)) e.whatsapp = 'Enter a valid Bangladeshi mobile number.';
    if (b?.email && !validEmail(b.email)) e.email = 'Enter a valid email.';
    if (b?.pay?.bkash?.number && !normPhone(b.pay.bkash.number)) e.bkashNum = 'Enter a valid number.';
    if (b?.pay?.nagad?.number && !normPhone(b.pay.nagad.number)) e.nagadNum = 'Enter a valid number.';
    if (!b?.pay?.cod?.enabled && !b?.pay?.bkash?.enabled && !b?.pay?.nagad?.enabled) e.codOn = 'Keep at least one payment method on.';
    if (Object.keys(e).length) fail(e);
    const next: Settings = {
      announcement: str(b.announcement, 240), phone: str(b.phone, 40), whatsapp: str(b.whatsapp, 40), email: str(b.email, 120), instagram: str(b.instagram, 120), facebook: str(b.facebook, 120),
      pay: {
        cod: { enabled: !!b.pay.cod.enabled },
        bkash: { enabled: !!b.pay.bkash.enabled, number: str(b.pay.bkash.number, 20) },
        nagad: { enabled: !!b.pay.nagad.enabled, number: str(b.pay.nagad.number, 20) },
      },
      policies: Object.fromEntries(Object.entries(cur.policies).map(([k, p]) => [k, { title: p.title, text: str(b.policies?.[k]?.text, 6000), approved: !!b.policies?.[k]?.approved }])),
      faqs: (Array.isArray(b.faqs) ? b.faqs : cur.faqs).slice(0, 40).map((f: any) => ({ q: str(f.q, 300), a: str(f.a, 2000) })).filter((f: any) => f.q && f.a),
      faqApproved: !!b.faqApproved,
    };
    await this.store.prisma.appSetting.upsert({ where: { key: 'settings' }, update: { value: next as any }, create: { key: 'settings', value: next as any } });
    await this.audit(actor, 'settings', 'Updated settings');
    return next;
  }

  /* ---------- Calendar blocks ---------- */
  async addBlock(actor: Actor, b: any) {
    const db = await this.store.catalogue();
    const date = str(b?.date, 10);
    const scope = str(b?.scope || 'all', 60);
    const e: Record<string, string> = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'Choose a date.';
    if (!['all', 'delivery', 'custom'].includes(scope) && !db.services.some((s) => s.id === scope)) e.scope = 'Choose what to block.';
    const slot = str(b?.slot || 'all', 40);
    if (slot !== 'all' && !db.delivery.slots.some((s) => s.id === slot)) e.slot = 'Choose a delivery window or all.';
    if (Object.keys(e).length) fail(e);
    const row = await this.store.prisma.block.create({ data: { date, scope, slot, reason: str(b?.reason, 160) } });
    await this.audit(actor, 'calendar', `Blocked ${date} (${scope}${slot !== 'all' ? ', ' + slot : ''})${b?.reason ? ' · ' + str(b.reason, 160) : ''}`);
    return row;
  }
  async removeBlock(actor: Actor, id: string) {
    const row = await this.store.prisma.block.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('That block no longer exists.');
    await this.store.prisma.block.delete({ where: { id } });
    await this.audit(actor, 'calendar', `Removed block on ${row.date} (${row.scope})`);
    return { ok: true };
  }
}

