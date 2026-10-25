import type { Db } from '@flowtus/core';
import type { PublicCatalogue } from './types';

/** Wraps the public catalogue in core's `Db` shape so the same pure rules (pricing, availability) run in the browser for instant feedback.
 *  The server always re-checks everything on submit. */
export function toDb(cat: PublicCatalogue): Db {
  return {
    v: 2,
    ...cat,
    blocks: cat.blocks.map((b, i) => ({ id: 'b' + i, ...b })),
    settings: cat.settings as unknown as Db['settings'],
    teams: [],
    orders: [],
    requests: [],
    audit: [],
    idem: {},
    demo: { failNext: false },
  };
}
