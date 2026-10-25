import { BadRequestException, ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import type { Result } from '@flowtus/core';

/** Turns a core rule result into the right HTTP error, or returns it when it succeeded. */
export function unwrap<T extends Result>(r: T): T {
  if (r.errors) throw new UnprocessableEntityException({ message: 'Please check the highlighted fields.', errors: r.errors });
  if (r.priceChanged) throw new ConflictException({ code: 'PRICE_CHANGED', message: 'The unit price changed.', ...r.priceChanged });
  if (r.totalChanged) throw new ConflictException({ code: 'TOTAL_CHANGED', message: 'The order total changed.', ...r.totalChanged });
  if (r.duplicateOf) throw new ConflictException({ code: 'DUPLICATE', message: 'You already sent a request for this service on this date.', ref: r.duplicateOf.ref, token: r.duplicateOf.token, status: r.duplicateOf.status });
  if (r.cart) throw new ConflictException({ code: 'CART_ISSUES', message: r.error });
  if (r.error) {
    if (/^Only the owner/.test(r.error)) throw new ForbiddenException(r.error);
    throw new BadRequestException({ message: r.error, field: r.field });
  }
  return r;
}
