import type { Area, Block, CustomItem, DeliveryConfig, Occasion, Product, Service } from '@flowtus/core';

export interface PublicSettings {
  announcement: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  facebook: string;
  pay: { cod: { enabled: boolean }; bkash: { enabled: boolean }; nagad: { enabled: boolean } };
  policies: Record<string, { title: [string, string]; text: string; approved: boolean }>;
  faqs: { q: string; a: string }[];
  faqApproved: boolean;
}
export interface PublicCatalogue {
  products: Product[];
  custom: CustomItem[];
  services: Service[];
  occasions: Occasion[];
  areas: Area[];
  delivery: DeliveryConfig;
  blocks: Pick<Block, 'date' | 'scope' | 'slot' | 'reason'>[];
  settings: PublicSettings;
}
