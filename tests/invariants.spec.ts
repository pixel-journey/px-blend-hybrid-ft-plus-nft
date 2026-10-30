export const invariants = [
  {
    id: "fake-ft",
    attack: "A foreign contract notifies an eosio.token::transfer shape.",
    expect: "asserted in blend.test.ts: fake token",
  },
  {
    id: "fake-nft",
    attack: "A foreign contract notifies an atomicassets::transfer shape.",
    expect: "asserted in blend.test.ts: fake nft",
  },
  {
    id: "self-payout",
    attack: "A later mint or refund notifies this contract.",
    expect: "asserted in blend.test.ts: from == self credits nothing",
  },
  {
    id: "batch-cap",
    attack: "21 asset ids in one transfer.",
    expect: "asserted in blend.test.ts: bad asset batch",
  },
  {
    id: "wrong-symbol",
    attack: "Deposit WAX against a balance already priced in PXJ.",
    expect: "asserted in blend.test.ts: mixed symbols",
  },
  {
    id: "template-match",
    attack: "Craft with an asset whose template is not in the recipe.",
    expect: "asserted in blend.test.ts: template mismatch, no debit",
  },
  {
    id: "no-partial-success",
    attack: "Treat a reverted craft as if the FT was spent.",
    expect: "craft throws and the input vault object is unchanged. No mint.",
  },
];
