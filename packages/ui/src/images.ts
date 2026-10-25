/* Placeholder photography: free Pexels stock loaded by photo id. Replace with real FLOWTUS photography before launch. */
const POOL = [931167, 3782745, 2791043, 17393206, 17558430, 3392982, 4467139, 33961379, 34989978, 34990301, 28795942];
const REAL: Record<string, number[]> = {
  'chocolate-box': [18579833, 6578933], 'perfume-box': [4925718, 19272234], 'skincare-set': [10825661, 10924502], 'curated-premium': [426905, 18579833], gifts: [6657768],
  'occ-birthday': [14457430], 'occ-anniversary': [18824137], 'occ-proposal': [30093401], 'occ-wedding': [28497003], 'occ-sympathy': [15312442], 'occ-graduation': [2791043],
  'occ-congratulations': [17393206], 'occ-thank-you': [3392982], 'occ-apology': [4467139], 'occ-get-well': [33961379], 'occ-new-baby': [34989978], 'occ-just-because': [931167],
  'car-decoration': [11474248, 25052928, 11474253, 27880483], 'holud-decoration': [31307957, 31002035], 'bashor-ghor': [17301475, 6551792, 18824137],
  'birthday-setup': [14457438, 14457430], 'anniversary-setup': [18824137, 6551792, 17301475], 'proposal-setup': [30093401, 18824137], 'wedding-accessories': [28497003],
  'dala-decoration': [31002035], 'rose-garland-pair': [28497003], 'holud-set': [31002035], 'marigold-chain': [31002035], 'ivory-grace': [15312442],
};
const hsh = (s: string) => {
  let x = 0;
  for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) % 9000;
  return x;
};
export function IMG(key: string, n = 0, w = 800): string {
  const r = REAL[key];
  const p = r ? r[n % r.length] : POOL[(hsh(key) + n * 5) % POOL.length];
  return `https://images.pexels.com/photos/${p}/pexels-photo-${p}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
}
