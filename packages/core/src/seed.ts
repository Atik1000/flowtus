/* Seed data (DEMONSTRATION ONLY — prices, products, packages and photos are placeholders until FLOWTUS confirms them). */
import { addDays, dhakaNow, DhakaNow } from './util';
import type { Area, CustomItem, Db, Occasion, Product, Service, Settings } from './types';

export const OCCASIONS: Occasion[] = (
  [
    ['birthday', 'Birthday', 'জন্মদিন'],
    ['anniversary', 'Anniversary', 'বিবাহবার্ষিকী'],
    ['proposal', 'Proposal', 'প্রপোজাল'],
    ['wedding', 'Wedding', 'বিয়ে'],
    ['graduation', 'Graduation', 'গ্র্যাজুয়েশন'],
    ['congratulations', 'Congratulations', 'অভিনন্দন'],
    ['thank-you', 'Thank you', 'ধন্যবাদ'],
    ['apology', 'Apology', 'ক্ষমা চাওয়া'],
    ['get-well', 'Get well soon', 'দ্রুত আরোগ্য'],
    ['new-baby', 'New baby', 'নবজাতক'],
    ['sympathy', 'Sympathy', 'সমবেদনা'],
    ['just-because', 'Just because', 'এমনিই'],
  ] as [string, string, string][]
).map(([id, en, bn]) => ({ id, name: [en, bn] as [string, string], active: true }));

export const DEPTS: Record<string, { name: [string, string]; cats: [string, string, string][] }> = {
  flowers: {
    name: ['Flowers', 'ফুল'],
    cats: [
      ['rose-bouquets', 'Rose bouquets', 'গোলাপের তোড়া'],
      ['mixed-bouquets', 'Mixed bouquets', 'মিশ্র তোড়া'],
      ['premium', 'Premium arrangements', 'প্রিমিয়াম অ্যারেঞ্জমেন্ট'],
      ['minimal', 'Minimalist designs', 'মিনিমাল ডিজাইন'],
      ['seasonal', 'Seasonal flowers', 'মৌসুমি ফুল'],
      ['garlands', 'Garlands & chains', 'মালা'],
    ],
  },
  gifts: {
    name: ['Gifts', 'উপহার'],
    cats: [
      ['chocolate', 'Chocolate boxes', 'চকলেট বক্স'],
      ['perfume', 'Perfume boxes', 'পারফিউম বক্স'],
      ['skincare', 'Skincare sets', 'স্কিনকেয়ার সেট'],
      ['curated', 'Curated boxes', 'বাছাই করা বক্স'],
      ['combos', 'Flower combinations', 'ফুল ও উপহার'],
    ],
  },
  extras: {
    name: ['Extras', 'অতিরিক্ত'],
    cats: [
      ['cards', 'Greeting cards', 'শুভেচ্ছা কার্ড'],
      ['teddy', 'Teddy bears', 'টেডি বেয়ার'],
      ['balloons', 'Balloons', 'বেলুন'],
      ['sweets', 'Chocolates', 'চকলেট'],
      ['wrapping', 'Wrapping & ribbons', 'র‍্যাপিং ও ফিতা'],
    ],
  },
  wedding: {
    name: ['Wedding accessories', 'বিয়ের ফুলের গয়না'],
    cats: [
      ['garlands-w', 'Bride & groom garlands', 'বর-কনের মালা'],
      ['jewellery', 'Floral jewellery', 'ফুলের গয়না'],
      ['groom', 'Groom accessories', 'বরের অনুষঙ্গ'],
    ],
  },
};

type VariantTuple = [string, string, number | null, boolean?];
function P(id: string, dept: string, cat: string, name: string, occ: string[], variants: VariantTuple[], o: Partial<Product> = {}): Product {
  return {
    id,
    slug: id,
    dept,
    cat,
    name,
    occ,
    variants: variants.map(([vid, vname, price, avail]) => ({ id: vid, name: vname, price, available: avail !== false })),
    short: '',
    description: '',
    composition: '',
    care:
      dept === 'flowers' || dept === 'wedding'
        ? 'Trim stems at an angle, keep in fresh water away from direct sun and AC vents. Change water daily.'
        : '',
    available: true,
    archived: false,
    maxQty: 10,
    leadDays: 0,
    builder: false,
    addons: false,
    builderExtra: false,
    wrap: false,
    featured: false,
    img: id,
    sample: true,
    ...o,
  };
}

export function seedProducts(): Product[] {
  return [
    P('classic-red-roses', 'flowers', 'rose-bouquets', 'Classic Red Roses', ['anniversary', 'proposal', 'birthday', 'just-because'], [['12', '12 stems', 1490], ['24', '24 stems', 2690], ['50', '50 stems', 5290, false]], { short: 'Long-stem red roses, hand-tied in our signature wrap.', composition: 'Red roses, eucalyptus, signature paper wrap', builder: true, addons: true, featured: true }),
    P('blush-garden', 'flowers', 'mixed-bouquets', 'Blush Garden Bouquet', ['birthday', 'thank-you', 'congratulations', 'new-baby'], [['std', 'Standard', 1890], ['lg', 'Large', 2790]], { short: 'Soft pinks and creams with garden greens.', composition: 'Pink roses, carnations, chrysanthemum, seasonal greens', builder: true, addons: true, featured: true }),
    P('ivory-grace', 'flowers', 'minimal', 'Ivory Grace', ['sympathy', 'get-well', 'thank-you'], [['std', 'Standard', 1690]], { short: 'White lilies and roses, quiet and composed.', composition: 'White lilies, white roses, leatherleaf', builder: true, addons: true }),
    P('grand-bloom', 'flowers', 'premium', 'Grand Bloom Arrangement', ['anniversary', 'congratulations', 'wedding'], [['sig', 'Signature', 6490], ['grand', 'Grand', 9800]], { short: 'A tall statement arrangement in a keepsake vessel.', composition: 'Roses, lilies, orchids, hydrangea in ceramic vessel', addons: true, featured: true, maxQty: 3, leadDays: 1 }),
    P('seasonal-tulips', 'flowers', 'seasonal', 'Seasonal Tulip Bunch', ['just-because', 'birthday'], [['10', '10 stems', 2490]], { short: 'Imported tulips when in season.', available: false }),
    P('pink-promise', 'flowers', 'rose-bouquets', 'Pink Promise Roses', ['proposal', 'apology', 'anniversary'], [['12', '12 stems', 1390], ['24', '24 stems', 2490]], { short: 'Pink roses for a gentle message.', builder: true, addons: true }),
    P('sunflower-joy', 'flowers', 'mixed-bouquets', 'Sunflower Joy', ['graduation', 'congratulations', 'get-well'], [['std', 'Standard', 1590]], { short: 'Bright sunflowers with white accents.', builder: true, addons: true, img: null }),
    P('orchid-pot', 'flowers', 'premium', 'Phalaenopsis Orchid Pot', ['congratulations', 'new-baby', 'thank-you'], [['std', 'Standard', null]], { short: 'Potted orchid. Price depends on current supply.' }),
    P('marigold-chain', 'flowers', 'garlands', 'Marigold Door Chain', ['wedding'], [['5ft', '5 ft', 650], ['10ft', '10 ft', 1200]], { short: 'Fresh marigold chain for doors and gates.', leadDays: 1 }),
    P('chocolate-box', 'gifts', 'chocolate', 'Chocolate Gift Box', ['birthday', 'thank-you', 'apology', 'just-because'], [['16', 'Box of 16', 1850]], { short: 'Assorted premium chocolates.', builderExtra: true, featured: true }),
    P('perfume-box', 'gifts', 'perfume', 'Perfume Gift Box', ['anniversary', 'birthday'], [['std', 'Standard', 4890]], { short: 'A boxed fragrance with a single rose.' }),
    P('skincare-set', 'gifts', 'skincare', 'Skincare Gift Set', ['birthday', 'thank-you', 'new-baby'], [['std', 'Standard', 3490]], { short: 'A gentle skincare trio.' }),
    P('curated-premium', 'gifts', 'curated', 'Curated Premium Box', ['anniversary', 'congratulations', 'wedding'], [['sig', 'Signature', 7900]], { short: 'Flowers, chocolates and a keepsake, boxed.', maxQty: 5, featured: true }),
    P('roses-chocolates', 'gifts', 'combos', 'Roses & Chocolates', ['anniversary', 'proposal', 'apology'], [['std', 'Standard', 2990]], { short: '12 red roses with a box of chocolates.' }),
    P('roses-perfume', 'gifts', 'combos', 'Roses & Perfume', ['anniversary', 'birthday'], [['std', 'Standard', 5690]], { short: 'Red roses paired with a boxed fragrance.' }),
    P('card', 'extras', 'cards', 'Greeting card', ['birthday', 'anniversary', 'thank-you'], [['std', 'Card', 150]], { builderExtra: true, maxQty: 3 }),
    P('teddy', 'extras', 'teddy', 'Small teddy bear', ['birthday', 'anniversary', 'proposal', 'new-baby'], [['std', 'Small', 650]], { builderExtra: true, maxQty: 2 }),
    P('balloons', 'extras', 'balloons', 'Balloon set (3)', ['birthday', 'congratulations', 'new-baby'], [['std', 'Set of 3', 450]], { builderExtra: true, maxQty: 3 }),
    P('mini-choc', 'extras', 'sweets', 'Chocolate bar trio', ['birthday', 'just-because'], [['std', 'Trio', 550]], { builderExtra: true, maxQty: 3 }),
    P('premium-wrap', 'extras', 'wrapping', 'Premium paper wrap', [], [['std', 'Wrap', 250]], { wrap: true }),
    P('satin-ribbon', 'extras', 'wrapping', 'Satin ribbon & bow', [], [['std', 'Ribbon', 120]], { wrap: true }),
    P('kraft-wrap', 'extras', 'wrapping', 'Kraft paper wrap', [], [['std', 'Wrap', 150]], { wrap: true, available: false }),
    P('rose-garland-pair', 'wedding', 'garlands-w', 'Bride & Groom Rose Garland Pair', ['wedding'], [['std', 'Standard pair', 3800], ['prem', 'Premium pair', 6500]], { short: 'Matching rose garlands, made fresh the day before.', leadDays: 1, maxQty: 4, featured: true }),
    P('bridal-jewellery', 'wedding', 'jewellery', 'Bridal Floral Jewellery Set', ['wedding'], [['std', 'Custom set', null]], { short: 'Made to measure. Request a quote with your design.' }),
    P('hand-gajra', 'wedding', 'jewellery', 'Hand Gajra (pair)', ['wedding'], [['std', 'Pair', 450]], { short: 'Fresh beli wrist gajra.', leadDays: 1 }),
    P('groom-boutonniere', 'wedding', 'groom', 'Groom Floral Boutonnière', ['wedding'], [['std', 'Single', 550]], { short: 'A small rose and greenery piece for the groom.' }),
    P('holud-set', 'wedding', 'jewellery', 'Holud Floral Accessory Set', ['wedding'], [['std', 'Set', 2200]], { short: 'Marigold and rajanigandha set for holud.', leadDays: 2 }),
  ];
}

/* Custom flower catalogue: unit-priced items. Prices are DEMO values. */
function C(id: string, name: string, bn: string, type: string, unit: string, unitPrice: number | null, priceMode: CustomItem['priceMode'], min: number, max: number, multiple: number, presets: number[], o: Partial<CustomItem> = {}): CustomItem {
  return { id, name, bn, type, unit, unitPrice, priceMode, min, max, multiple, presets, available: true, seasonal: false, leadDays: 1, ...o };
}
export function seedCustom(): CustomItem[] {
  return [
    C('red-rose', 'Red rose', 'লাল গোলাপ', 'Flower', 'stem', 30, 'fixed', 10, 2000, 1, [12, 24, 50, 120, 200]),
    C('marigold', 'Marigold', 'গাঁদা ফুল', 'Flower', 'piece', 3, 'fixed', 50, 10000, 1, [100, 200, 500, 1000], { seasonal: true }),
    C('marigold-garland', 'Marigold garland', 'গাঁদা ফুলের মালা', 'Garland', 'garland', 120, 'fixed', 1, 200, 1, [5, 10, 20, 50]),
    C('tuberose', 'Tuberose (bundles of 10)', 'রজনীগন্ধা', 'Flower', 'stem', 25, 'fixed', 10, 1000, 10, [20, 50, 100]),
    C('white-rose', 'White rose', 'সাদা গোলাপ', 'Flower', 'stem', 45, 'confirm', 10, 1000, 1, [12, 24, 50]),
    C('beli-chain', 'Jasmine (beli) chain', 'বেলি ফুলের মালা', 'Garland', 'chain', null, 'confirm', 1, 100, 1, [5, 10, 20]),
    C('custom-garland', 'Custom-length garland', 'মাপমতো মালা', 'Garland', 'foot', null, 'quote', 1, 100, 1, [5, 10, 20], { leadDays: 2 }),
    C('custom-bouquet', 'Custom bouquet', 'নিজের মতো তোড়া', 'Bouquet', 'bouquet', null, 'quote', 1, 50, 1, [1, 5, 10], { leadDays: 2 }),
    C('gladiolus', 'Gladiolus', 'গ্লাডিওলাস', 'Flower', 'stem', 35, 'fixed', 10, 500, 1, [20, 50], { available: false }),
  ];
}

export const UNITS: Record<string, [[string, string], string]> = {
  stem: [['stem', 'stems'], 'পিস'],
  piece: [['piece', 'pieces'], 'পিস'],
  garland: [['garland', 'garlands'], 'টি মালা'],
  chain: [['chain', 'chains'], 'টি মালা'],
  foot: [['ft', 'ft'], 'ফুট'],
  bouquet: [['bouquet', 'bouquets'], 'টি তোড়া'],
  bundle: [['bundle', 'bundles'], 'বান্ডেল'],
  tray: [['tray', 'trays'], 'টি ডালা'],
  table: [['table', 'tables'], 'টি টেবিল'],
};
export const unitLabel = (u: string, n: number, lang?: string): string => {
  const x = UNITS[u] || [[u, u], u];
  return lang === 'bn' ? (x[1] as string) : (x[0] as [string, string])[n === 1 ? 0 : 1];
};

export const seedAreas = (): Area[] => [
  { id: 'gulshan-1', name: ['Gulshan 1', 'গুলশান ১'], delivery: true, fee: 100 },
  { id: 'gulshan-2', name: ['Gulshan 2', 'গুলশান ২'], delivery: true, fee: 100 },
  { id: 'banani', name: ['Banani', 'বনানী'], delivery: true, fee: 120 },
  { id: 'baridhara', name: ['Baridhara', 'বারিধারা'], delivery: false, fee: 150 },
  { id: 'niketan', name: ['Niketan', 'নিকেতন'], delivery: false, fee: 150 },
];

/* Service definitions. fields = ordered list of field keys; req = required keys. */
function S(o: Partial<Service> & { id: string }): Service {
  return {
    active: true,
    priceModel: 'quote',
    packages: [],
    fromPrice: null,
    perUnit: null,
    depositPct: 30,
    leadDays: 3,
    maxDays: 180,
    hours: [8, 21],
    durationHrs: 3,
    capacity: 2,
    coverage: ['gulshan-1', 'gulshan-2', 'banani'],
    partner: false,
    partnerAvailable: true,
    included: [],
    excluded: [],
    cancellation: 'Cancellation terms are being finalised by FLOWTUS. Your quote will state them before you pay anything.',
    img: o.id,
    sample: true,
    group: 'wedding',
    name: ['', ''],
    short: '',
    fields: [],
    req: [],
    ...o,
  } as Service;
}
const BASE_CONTACT = ['name', 'phone', 'notes'];
export function seedServices(): Service[] {
  return [
    S({ id: 'car-decoration', group: 'wedding', name: ['Wedding car decoration', 'বিয়ের গাড়ি সাজানো'], short: 'Fresh or artificial floral styling for the wedding car, installed at your location.', priceModel: 'package', packages: [{ id: 'classic', name: 'Classic bonnet', price: 4500, includes: 'Bonnet heart or line design, ribbons' }, { id: 'signature', name: 'Signature', price: 8500, includes: 'Bonnet, roof line, door handles' }, { id: 'grand', name: 'Grand full car', price: 14000, includes: 'Full car, rear arrangement, mirrors' }], leadDays: 2, durationHrs: 2, capacity: 2, coverage: ['gulshan-1', 'gulshan-2', 'banani', 'baridhara'], included: ['Flowers and foam bases', 'Installation at your location', 'Removal-safe fixings'], excluded: ['The car itself', 'Driver or transport', 'Parking or venue fees'], fields: ['date', 'time', 'package', 'carType', 'carModel', 'carSupplied', 'flowerType', 'colours', 'style', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'time', 'package', 'carType', 'carModel', 'carSupplied', 'area', 'address', 'name', 'phone'] }),
    S({ id: 'wedding-accessories', group: 'wedding', name: ['Custom bridal & groom accessories', 'বর-কনের ফুলের অনুষঙ্গ'], short: 'Garlands, floral jewellery, gajra and groom pieces made to your design.', leadDays: 2, capacity: null, depositPct: 50, fields: ['date', 'accessoryType', 'flowerType', 'colours', 'qty', 'sizing', 'handover', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'accessoryType', 'qty', 'handover', 'name', 'phone'], included: ['Fresh flowers', 'Fitting to the sizes you give us'], excluded: ['Alterations on the event day'] }),
    S({ id: 'dala-decoration', group: 'wedding', name: ['Dala & gift-tray decoration', 'ডালা ও উপহার সাজানো'], short: 'Floral styling for dala, kula and gift trays. Choose decoration only, or decoration with trays.', priceModel: 'from', fromPrice: 1500, perUnit: 'tray', leadDays: 2, capacity: 4, coverage: ['gulshan-1', 'gulshan-2', 'banani'], fields: ['date', 'itemType', 'trays', 'dalaScope', 'contents', 'colours', 'photo', 'handover', 'area', 'address', ...BASE_CONTACT], req: ['date', 'itemType', 'trays', 'dalaScope', 'handover', 'name', 'phone'], included: ['Floral decoration of each tray'], excluded: ['Sweets, cosmetics, clothing or other contents unless quoted', 'Trays unless you choose decoration + tray'] }),
    S({ id: 'bashor-ghor', group: 'wedding', name: ['Bashor ghor & bed decoration', 'বাসর ঘর সাজানো'], short: 'Room and bed decoration with fresh flowers, set up before you arrive.', priceModel: 'package', packages: [{ id: 'classic', name: 'Classic bed', price: 12000, includes: 'Bed canopy line, petals, side arrangements' }, { id: 'signature', name: 'Signature room', price: 22000, includes: 'Bed, headboard, entrance, candles' }], depositPct: 40, leadDays: 3, durationHrs: 4, capacity: 2, coverage: ['gulshan-1', 'gulshan-2'], fields: ['date', 'time', 'package', 'roomType', 'roomSize', 'flowerType', 'colours', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'time', 'package', 'roomType', 'area', 'address', 'name', 'phone'], included: ['Flowers and installation', 'Clean-up of packaging'], excluded: ['Furniture, bedding or lighting rental'] }),
    S({ id: 'holud-decoration', group: 'wedding', name: ['Holud & mehendi floral decoration', 'গায়ে হলুদ সাজসজ্জা'], short: 'Marigold-led floral styling for holud stages and seating.', fromPrice: 25000, depositPct: 50, leadDays: 7, durationHrs: 6, capacity: 1, fields: ['date', 'time', 'venueType', 'indoor', 'dims', 'scope', 'colours', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'time', 'venueType', 'indoor', 'scope', 'area', 'address', 'name', 'phone'], excluded: ['Stage structure, lighting and sound unless quoted'] }),
    S({ id: 'engagement', group: 'wedding', name: ['Engagement decoration', 'এনগেজমেন্ট সাজসজ্জা'], short: 'Floral styling for engagement ceremonies at home or a venue.', fromPrice: 18000, depositPct: 40, leadDays: 5, durationHrs: 4, capacity: 1, fields: ['date', 'time', 'venueType', 'indoor', 'dims', 'scope', 'colours', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'time', 'venueType', 'scope', 'area', 'address', 'name', 'phone'] }),
    S({ id: 'stage-entrance', group: 'wedding', name: ['Wedding stage & entrance florals', 'বিয়ের মঞ্চ ও প্রবেশপথ'], short: 'Large floral work for stages and entrances, delivered with a partner team.', partner: true, depositPct: 50, leadDays: 10, durationHrs: 8, capacity: 1, fields: ['date', 'time', 'venueType', 'indoor', 'dims', 'scope', 'colours', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'time', 'venueType', 'dims', 'scope', 'area', 'address', 'name', 'phone'], excluded: ['Stage structure, lighting, sound and catering'] }),
    S({ id: 'birthday-setup', group: 'event', name: ['Birthday decoration', 'জন্মদিনের সাজসজ্জা'], short: 'Flowers and balloons for birthday tables, rooms and photo walls.', priceModel: 'package', packages: [{ id: 'simple', name: 'Simple', price: 6500, includes: 'Table florals, balloon cluster' }, { id: 'deluxe', name: 'Deluxe', price: 12000, includes: 'Table, backdrop florals, balloons' }], leadDays: 2, durationHrs: 2, capacity: 3, fields: ['date', 'time', 'package', 'venueType', 'theme', 'colours', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'time', 'package', 'venueType', 'area', 'address', 'name', 'phone'] }),
    S({ id: 'anniversary-setup', group: 'event', name: ['Anniversary room surprise', 'বিবাহবার্ষিকীর সারপ্রাইজ'], short: 'A room styled with roses, petals and candles.', priceModel: 'package', packages: [{ id: 'room', name: 'Room surprise', price: 9000, includes: 'Petal path, bed florals, candles' }], leadDays: 2, durationHrs: 2, capacity: 2, fields: ['date', 'time', 'package', 'roomType', 'colours', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'time', 'package', 'roomType', 'area', 'address', 'name', 'phone'] }),
    S({ id: 'proposal-setup', group: 'event', name: ['Proposal setup', 'প্রপোজাল সেটআপ'], short: 'A private floral setup for the question.', priceModel: 'package', packages: [{ id: 'intimate', name: 'Intimate', price: 9500, includes: 'Floral arch or heart, petals, candles' }, { id: 'rooftop', name: 'Rooftop', price: 18000, includes: 'Arch, aisle florals, lanterns' }], leadDays: 3, durationHrs: 3, capacity: 2, fields: ['date', 'time', 'package', 'venueType', 'indoor', 'colours', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'time', 'package', 'venueType', 'indoor', 'area', 'address', 'name', 'phone'] }),
    S({ id: 'centrepieces', group: 'event', name: ['Table centrepieces', 'টেবিল সেন্টারপিস'], short: 'Centrepieces and table arrangements for dinners and small events.', priceModel: 'from', fromPrice: 1200, perUnit: 'table', leadDays: 3, durationHrs: 2, capacity: 3, fields: ['date', 'time', 'tables', 'colours', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'time', 'tables', 'area', 'address', 'name', 'phone'] }),
    S({ id: 'photo-corner', group: 'event', name: ['Photo-corner decoration', 'ফটো কর্নার সাজসজ্জা'], short: 'A floral photo wall for events.', active: false, fields: ['date', 'time', 'dims', 'colours', 'area', 'address', 'photo', ...BASE_CONTACT], req: ['date', 'time', 'area', 'address', 'name', 'phone'] }),
  ];
}

export const seedSettings = (): Settings => ({
  announcement: 'Same-day delivery in Gulshan and Banani for orders before 3 pm',
  phone: '',
  whatsapp: '',
  email: '',
  instagram: '',
  facebook: '',
  pay: { cod: { enabled: true }, bkash: { enabled: true, number: '' }, nagad: { enabled: true, number: '' } },
  policies: {
    delivery: { title: ['Delivery policy', 'ডেলিভারি নীতি'], text: 'We deliver to the areas listed at checkout, in the delivery windows shown. Every order is confirmed by our team before it is prepared.', approved: false },
    cancellation: { title: ['Cancellation & refunds', 'বাতিল ও রিফান্ড'], text: 'Draft. Cancellation and refund terms are pending owner approval. Your quote or order confirmation will state the terms that apply.', approved: false },
    substitution: { title: ['Substitution policy', 'বিকল্প ফুল নীতি'], text: 'Flowers are seasonal. If a flower is unavailable we will contact you before substituting with one of similar colour and value.', approved: false },
    booking: { title: ['Booking & deposit terms', 'বুকিং ও অগ্রিম শর্ত'], text: 'A booking request is not a confirmed booking. A booking is confirmed only after you approve a quote, any required deposit is verified, and FLOWTUS confirms availability.', approved: false },
    custom: { title: ['Custom-order terms', 'কাস্টম অর্ডারের শর্ত'], text: 'Estimates are not final prices. Final prices depend on market supply and are given in a written quote.', approved: false },
    privacy: { title: ['Privacy', 'গোপনীয়তা'], text: 'We use your details only to fulfil your order or booking.', approved: false },
  },
  faqs: (
    [
      ['Where do you deliver?', 'Currently Gulshan 1, Gulshan 2 and Banani. Some decoration services cover other areas; each service page lists its own coverage.'],
      ['Is a booking request a confirmed booking?', 'No. We first check availability, then send you a quote. Your booking is confirmed only after you approve the quote and any deposit is verified.'],
      ['Is the custom-order estimate the final price?', 'No. It is calculated from current unit prices. Flower prices change with the market, so we confirm the final price in a quote.'],
      ['How do I pay with bKash or Nagad?', 'Choose it at checkout. After your order is placed you will see the number to send to and can submit your transaction ID. We verify every payment manually. We never ask for your PIN or OTP.'],
    ] as [string, string][]
  ).map(([q, a]) => ({ q, a })),
  faqApproved: false,
});

export function seed(now?: DhakaNow): Db {
  now = now || dhakaNow();
  return {
    v: 2,
    products: seedProducts(),
    custom: seedCustom(),
    services: seedServices(),
    occasions: OCCASIONS.map((o) => ({ ...o })),
    areas: seedAreas(),
    delivery: {
      slots: [
        { id: 'morning', label: '10:00 – 13:00', start: 10, cap: 8, enabled: true },
        { id: 'afternoon', label: '14:00 – 17:00', start: 14, cap: 8, enabled: true },
        { id: 'evening', label: '18:00 – 21:00', start: 18, cap: 6, enabled: true },
      ],
      sameDay: true,
      cutoffHour: 15,
      leadHours: 3,
      maxDaysAhead: 30,
      customMaxDays: 60,
    },
    blocks: [{ id: 'b1', date: addDays(now.date, 6), scope: 'all', slot: 'all', reason: 'Demo blocked date' }],
    teams: [
      { id: 't1', name: 'Team A (in-house)' },
      { id: 't2', name: 'Team B (in-house)' },
      { id: 'p1', name: 'Partner: stage florals' },
    ],
    settings: seedSettings(),
    orders: [],
    requests: [],
    audit: [],
    idem: {},
    demo: { failNext: false },
  };
}
