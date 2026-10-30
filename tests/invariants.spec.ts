export const invariants = [
  {
    id: "pxj-precision",
    attack: "Credit 1.0000 PXJ.",
    expect: "asserted in blend.test.ts: pxj precision. PXJ is 8 decimals on pixeljourney.",
  },
  {
    id: "fake-ft",
    attack: "eosio.token notifies a PXJ transfer.",
    expect: "asserted in blend.test.ts: fake token. The issuer is pixeljourney.",
  },
  {
    id: "fake-nft",
    attack: "A foreign contract notifies an atomicassets::transfer shape.",
    expect: "asserted in blend.test.ts: fake nft",
  },
  {
    id: "self-payout",
    attack: "A later refund notifies this contract.",
    expect: "asserted in blend.test.ts: from == self credits nothing",
  },
  {
    id: "batch-cap",
    attack: "21 asset ids in one transfer.",
    expect: "asserted in blend.test.ts: bad asset batch",
  },
  {
    id: "wrong-symbol",
    attack: "Deposit WAX against a PXJ balance.",
    expect: "asserted in blend.test.ts: mixed symbols",
  },
  {
    id: "template-match",
    attack: "Craft with an asset whose template is not in the recipe.",
    expect: "asserted in blend.test.ts: template mismatch, no debit",
  },
  {
    id: "withdraw",
    attack: "Treat the withdraw action body as a broadcast.",
    expect: "asserted in blend.test.ts: sent is false. 0.50000000 PXJ.",
  },
];
