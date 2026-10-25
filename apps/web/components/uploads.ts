import { checkUpload } from '@flowtus/core';

export interface PhotoState { id?: string; name: string; size: number; error?: string | null }

/** Validates type/size in the browser for instant feedback, then uploads to private storage. The server re-checks the file's real type. */
export async function uploadPhoto(file: File | null): Promise<PhotoState | null> {
  if (!file) return null;
  const err = checkUpload(file);
  if (err) return { name: file.name, size: file.size, error: err };
  const body = new FormData();
  body.append('file', file);
  try {
    const r = await fetch('/api/uploads', { method: 'POST', body });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { name: file.name, size: file.size, error: typeof d.message === 'string' ? d.message : 'Could not upload this photo.' };
    return { id: d.id, name: d.name, size: d.size };
  } catch {
    return { name: file.name, size: file.size, error: 'Could not upload this photo. Check your connection and try again.' };
  }
}
export const photoLabel = (p?: PhotoState | null) => (p && !p.error ? `${p.name} · ${Math.max(1, Math.round(p.size / 1024))} KB` : undefined);
