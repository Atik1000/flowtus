import { describe, expect, it } from 'vitest';
import { runTests } from './tests';

describe('FLOWTUS business rules', () => {
  const results = runTests();
  it('runs the full 94-scenario suite', () => {
    expect(results.length).toBe(94);
  });
  it('has no failing scenarios', () => {
    const failed = results.filter((r) => r.status === 'fail');
    expect(failed.map((f) => `${f.group}: ${f.name} — ${f.detail}`)).toEqual([]);
  });
  it('only reports infrastructure-dependent scenarios as n/a', () => {
    expect(results.filter((r) => r.status === 'n/a').length).toBe(3);
  });
});
