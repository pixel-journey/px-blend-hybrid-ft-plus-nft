export const invariants = [
  {
    id: "fake-ft",
    attack: "A foreign contract notifies an eosio.token::transfer shape.",
    expect: "get_first_receiver() is not eosio.token.",
  },
  {
    id: "fake-nft",
    attack: "A foreign contract notifies an atomicassets::transfer shape.",
    expect: "get_first_receiver() is not atomicassets.",
  },
  {
    id: "self-payout",
    attack: "A later mint or refund notifies this contract.",
    expect: "from == get_self() returns.",
  },
  {
    id: "batch-cap",
    attack: "21 asset ids in one transfer.",
    expect: "throws bad asset batch.",
  },
  {
    id: "wrong-symbol",
    attack: "Deposit WAX against a recipe priced in another symbol.",
    expect: "craft throws wrong symbol. Because craft is unfinished, this check is necessary but not sufficient.",
  },
  {
    id: "no-partial-success",
    attack: "Treat a reverted craft as if the NFT transfer stuck.",
    expect: "All three actions share one transaction. A failed check rolls the transfers back.",
  },
];
