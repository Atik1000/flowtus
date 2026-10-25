/* Configurable booking-form fields. Every service form is built from `service.fields` / `service.req` using these
   definitions and one renderer, so the owner can edit forms from the admin. Data only — no UI code. */
import type { Bi } from './types';

export type FieldType = 'text' | 'tel' | 'number' | 'date' | 'time' | 'textarea' | 'chips' | 'multi' | 'cards' | 'select' | 'file';
export type FieldOption = string | { value: string; label?: string; sub?: string; disabled?: boolean; reason?: string };
export interface FieldDef {
  type: FieldType;
  label: Bi;
  options?: FieldOption[];
  ph?: string;
  rows?: number;
  maxLen?: number;
  ac?: string;
}

export const FIELD_DEFS: Record<string, FieldDef> = {
  date: { type: 'date', label: ['Event date', 'অনুষ্ঠানের তারিখ'] },
  time: { type: 'time', label: ['Preferred setup time', 'পছন্দের সেটআপের সময়'] },
  package: { type: 'cards', label: ['Package', 'প্যাকেজ'] },
  carType: { type: 'chips', label: ['Car type', 'গাড়ির ধরন'], options: ['Sedan', 'SUV', 'Microbus', 'Open-top / vintage', 'Other'] },
  carModel: { type: 'text', label: ['Car make and model', 'গাড়ির মডেল'], ph: 'e.g. Toyota Premio, white' },
  carSupplied: { type: 'chips', label: ['Who provides the car?', 'গাড়ি কে দেবেন?'], options: ['I will provide the car', { value: 'FLOWTUS arranges the car', label: 'FLOWTUS arranges the car', disabled: true, reason: 'Not offered yet' }] },
  flowerType: { type: 'chips', label: ['Flowers', 'ফুলের ধরন'], options: ['Fresh', 'Artificial', 'Mix of both'] },
  colours: { type: 'multi', label: ['Colour preferences', 'রঙের পছন্দ'], options: ['Red', 'White', 'Pink', 'Yellow', 'Orange', 'Pastel mix', 'No preference'] },
  style: { type: 'chips', label: ['Decoration style', 'সাজের ধরন'], options: ['Classic', 'Modern minimal', 'Traditional', 'Show me options'] },
  area: { type: 'select', label: ['Area', 'এলাকা'] },
  address: { type: 'textarea', rows: 3, label: ['Setup address', 'ঠিকানা'], ph: 'House, road, block, landmark. Add parking or access notes.' },
  photo: { type: 'file', label: ['Reference photo (optional)', 'রেফারেন্স ছবি (ঐচ্ছিক)'] },
  name: { type: 'text', label: ['Your name', 'আপনার নাম'], ac: 'name' },
  phone: { type: 'tel', label: ['Phone or WhatsApp', 'ফোন বা হোয়াটসঅ্যাপ'], ph: '017XXXXXXXX', ac: 'tel' },
  notes: { type: 'textarea', label: ['Additional instructions', 'অতিরিক্ত নির্দেশনা'], maxLen: 1000 },
  accessoryType: { type: 'multi', label: ['What do you need?', 'কী প্রয়োজন?'], options: ['Bride garland', 'Groom garland', 'Floral jewellery set', 'Hand gajra', 'Hair accessories', 'Holud accessories', 'Groom boutonnière'] },
  qty: { type: 'number', label: ['How many pieces or sets?', 'কতটি?'] },
  sizing: { type: 'text', label: ['Sizes or fitting notes', 'মাপ'], ph: 'e.g. wrist 15 cm, garland length 36 in' },
  handover: { type: 'chips', label: ['Delivery', 'ডেলিভারি'], options: ['Deliver to my address', 'Deliver to the venue', { value: 'Collect from FLOWTUS', label: 'Collect from FLOWTUS', disabled: true, reason: 'No pickup point yet' }] },
  itemType: { type: 'multi', label: ['Items to decorate', 'কী সাজাবেন?'], options: ['Dala', 'Kula', 'Gift tray', 'Sweet tray', 'Other'] },
  trays: { type: 'number', label: ['Number of trays', 'ডালার সংখ্যা'] },
  dalaScope: {
    type: 'cards',
    label: ['What is included?', 'কী অন্তর্ভুক্ত?'],
    options: [
      { value: 'Decoration only', label: 'Decoration only', sub: 'You bring the trays and contents.' },
      { value: 'Decoration + trays', label: 'Decoration + trays', sub: 'We supply the trays or bases.' },
      { value: 'Decoration + trays + contents', label: 'Decoration + trays + contents', sub: 'We source the contents. Always quoted separately.' },
    ],
  },
  contents: { type: 'textarea', label: ['What will go on the trays?', 'ডালায় কী থাকবে?'], ph: 'e.g. sweets, saree, cosmetics. We supply contents only if quoted.' },
  roomType: { type: 'chips', label: ['Room', 'রুম'], options: ['Bedroom at home', 'Hotel room', 'Other'] },
  roomSize: { type: 'text', label: ['Room or bed size', 'রুম বা খাটের মাপ'], ph: 'e.g. King bed, 14 × 12 ft room' },
  venueType: { type: 'chips', label: ['Venue', 'ভেন্যু'], options: ['Home', 'Rooftop', 'Community centre', 'Hotel / banquet', 'Restaurant', 'Other'] },
  indoor: { type: 'chips', label: ['Indoor or outdoor', 'ভেতরে না বাইরে'], options: ['Indoor', 'Outdoor'] },
  dims: { type: 'text', label: ['Stage or area size', 'মঞ্চ বা জায়গার মাপ'], ph: 'e.g. 20 × 10 ft, or send photos' },
  scope: { type: 'textarea', rows: 3, label: ['What should we decorate?', 'কী কী সাজাতে হবে?'] },
  theme: { type: 'text', label: ['Theme (optional)', 'থিম (ঐচ্ছিক)'], ph: 'e.g. pastel, gold and white' },
  tables: { type: 'number', label: ['Number of tables', 'টেবিলের সংখ্যা'] },
};

/** Which section of the booking form a field belongs to (default: 'what'). */
export const FIELD_SECTION: Record<string, string> = {
  date: 'when', time: 'when', handover: 'where', area: 'where', address: 'where', photo: 'ref', notes: 'ref', name: 'you', phone: 'you',
};
export const FORM_SECTIONS: [string, Bi][] = [
  ['when', ['When', 'কখন']],
  ['what', ['Design & details', 'ডিজাইন ও বিবরণ']],
  ['where', ['Location', 'স্থান']],
  ['ref', ['References & notes', 'রেফারেন্স ও নোট']],
  ['you', ['Your details', 'আপনার তথ্য']],
];
