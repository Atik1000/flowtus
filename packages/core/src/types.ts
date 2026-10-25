/* Domain types. Records that carry deeply dynamic snapshots (orders, requests) keep loose `any` members. */

export type Bi = [string, string]; // [English, বাংলা]

export interface Variant {
  id: string;
  name: string;
  price: number | null;
  available: boolean;
}

export interface Product {
  id: string;
  slug: string;
  dept: string;
  cat: string;
  name: string;
  occ: string[];
  variants: Variant[];
  short: string;
  description: string;
  composition: string;
  care: string;
  available: boolean;
  archived: boolean;
  maxQty: number;
  leadDays: number;
  builder: boolean;
  addons: boolean;
  builderExtra: boolean;
  wrap: boolean;
  featured: boolean;
  img: string | null;
  sample: boolean;
}

export type PriceMode = 'fixed' | 'confirm' | 'quote';
export interface CustomItem {
  id: string;
  name: string;
  bn: string;
  type: string;
  unit: string;
  unitPrice: number | null;
  priceMode: PriceMode;
  min: number;
  max: number;
  multiple: number;
  presets: number[];
  available: boolean;
  seasonal: boolean;
  leadDays: number;
}

export interface ServicePackage {
  id: string;
  name: string;
  price: number;
  includes: string;
}
export interface Service {
  id: string;
  group: 'wedding' | 'event';
  name: Bi;
  short: string;
  active: boolean;
  priceModel: 'package' | 'from' | 'quote';
  packages: ServicePackage[];
  fromPrice: number | null;
  perUnit: string | null;
  depositPct: number;
  leadDays: number;
  maxDays: number;
  hours: [number, number];
  durationHrs: number;
  capacity: number | null;
  coverage: string[];
  partner: boolean;
  partnerAvailable: boolean;
  included: string[];
  excluded: string[];
  cancellation: string;
  img: string | null;
  sample: boolean;
  fields: string[];
  req: string[];
}

export interface Occasion {
  id: string;
  name: Bi;
  active: boolean;
}
export interface Area {
  id: string;
  name: Bi;
  delivery: boolean;
  fee: number;
}
export interface Slot {
  id: string;
  label: string;
  start: number;
  cap: number;
  enabled: boolean;
}
export interface DeliveryConfig {
  slots: Slot[];
  sameDay: boolean;
  cutoffHour: number;
  leadHours: number;
  maxDaysAhead: number;
  customMaxDays: number;
}
export interface Block {
  id: string;
  date: string;
  scope: string; // 'all' | 'delivery' | 'custom' | serviceId
  slot: string; // 'all' | slotId
  reason: string;
}
export interface Team {
  id: string;
  name: string;
}
export interface Policy {
  title: Bi;
  text: string;
  approved: boolean;
}
export interface Settings {
  announcement: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  facebook: string;
  pay: {
    cod: { enabled: boolean };
    bkash: { enabled: boolean; number: string };
    nagad: { enabled: boolean; number: string };
  };
  policies: Record<string, Policy>;
  faqs: { q: string; a: string }[];
  faqApproved: boolean;
}

export interface Actor {
  name: string;
  role: 'owner' | 'staff';
}

/** In-memory view of the database that the pure rules operate on. */
export interface Db {
  v: number;
  products: Product[];
  custom: CustomItem[];
  services: Service[];
  occasions: Occasion[];
  areas: Area[];
  delivery: DeliveryConfig;
  blocks: Block[];
  teams: Team[];
  settings: Settings;
  orders: any[];
  requests: any[];
  audit: any[];
  idem: Record<string, string>;
  demo: { failNext: boolean };
}

export type Kind = 'order' | 'custom' | 'booking' | 'corporate';
