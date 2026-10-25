'use client';
import { Field, type FieldProps } from '@flowtus/ui';
import type { FpField } from './FormPage';
import type { FormApi } from './useForm';

const WIDE = new Set(['textarea', 'chips', 'multi', 'cards', 'qty', 'file', 'addons', 'rows', 'info']);

/** A field cell for FormPage; wide types span the full row. */
export function ff(props: FieldProps, key = props.name): FpField {
  return { key, node: <Field {...props} />, wide: WIDE.has(props.type) };
}

/** value / onChange / error wiring for a form created with useForm. */
export function bind(form: FormApi, key: string) {
  return { name: key, value: form.v[key], onChange: (x: any) => form.set(key, x), error: form.errors[key] || '' };
}
