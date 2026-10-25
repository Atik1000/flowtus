/* Typed fetch wrapper for the FLOWTUS API. Errors keep the server's field errors and codes so forms can show them verbatim. */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  code?: string;
  data: any;
  constructor(status: number, data: any) {
    super(typeof data?.message === 'string' ? data.message : Array.isArray(data?.message) ? data.message.join(' ') : 'Something went wrong. Please try again.');
    this.status = status;
    this.data = data;
    this.errors = data?.errors;
    this.code = data?.code;
  }
  get network() {
    return this.status === 0;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  idempotencyKey?: string;
  /** Marks the request as coming from the admin app (CSRF header for cookie-authenticated writes). */
  admin?: boolean;
  signal?: AbortSignal;
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey;
  if (opts.admin) headers['x-requested-with'] = 'flowtus-admin';
  let res: Response;
  try {
    res = await fetch('/api' + path, { method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, credentials: 'same-origin', signal: opts.signal, cache: 'no-store' });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError(0, { message: 'We could not reach the server. Nothing was saved and your details are still here. Please try again.' });
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

/** A random key so a retried submit returns the original record instead of creating a duplicate. */
export const newIdempotencyKey = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^A-Za-z0-9_-]/g, '');
