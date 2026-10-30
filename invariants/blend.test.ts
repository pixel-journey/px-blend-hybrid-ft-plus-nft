import assert from "node:assert/strict";
import test from "node:test";
import {
  applyFtNotify,
  applyNftNotify,
  canCraft,
  craft,
  type Recipe,
  type Vault,
} from "./blend.ts";

const recipe: Recipe = {
  id: 1,
  ft_required: 100n,
  ft_symbol: "4,PXJ",
  template_ids: [42],
};

const vault: Vault = {
  user: "alice",
  ft: 100n,
  ft_symbol: "4,PXJ",
  assets: [{ id: 1001n, template_id: 42 }],
};

test("owner with sufficient ingredients may craft", () => {
  const result = canCraft("alice", vault, recipe);
  assert.equal(result.ok, true);
});

test("non-owner is refused", () => {
  const result = canCraft("bob", vault, recipe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /owner/);
});

test("insufficient FT is refused", () => {
  const result = canCraft("alice", { ...vault, ft: 50n }, recipe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /insufficient/);
});

test("non-positive FT is refused", () => {
  const result = canCraft("alice", { ...vault, ft: 0n }, recipe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /non-positive/);
});

test("missing vault is refused", () => {
  const result = canCraft("alice", null, recipe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /no vault/);
});

test("unknown recipe is refused", () => {
  const result = canCraft("alice", vault, null);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /unknown recipe/);
});

test("a held asset of the wrong template is refused", () => {
  const result = canCraft("alice", {
    ...vault,
    assets: [{ id: 1001n, template_id: 7 }],
  }, recipe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "template mismatch");
});

test("two required copies need two held assets", () => {
  const doubled = { ...recipe, template_ids: [42, 42] };
  assert.equal(canCraft("alice", vault, doubled).ok, false);
  const enough = canCraft("alice", {
    ...vault,
    assets: [
      { id: 1001n, template_id: 42 },
      { id: 1002n, template_id: 42 },
    ],
  }, doubled);
  assert.equal(enough.ok, true);
});

test("craft debits the recipe and leaves the extra asset", () => {
  const held: Vault = {
    ...vault,
    ft: 150n,
    assets: [
      { id: 1002n, template_id: 42 },
      { id: 1001n, template_id: 42 },
      { id: 9n, template_id: 7 },
    ],
  };
  const result = craft("alice", held, { ...recipe, template_ids: [42] });
  assert.equal(result.minted, null);
  assert.deepEqual(result.consumedIds, [1001n]);
  assert.equal(result.ftSpent, 100n);
  assert.equal(result.vault.ft, 50n);
  assert.deepEqual(result.vault.assets, [
    { id: 1002n, template_id: 42 },
    { id: 9n, template_id: 7 },
  ]);
  assert.equal(held.ft, 150n);
  assert.equal(held.assets.length, 3);
});

test("a refused craft does not debit", () => {
  assert.throws(() => craft("alice", vault, { ...recipe, template_ids: [9] }), /template mismatch/);
  assert.equal(vault.ft, 100n);
});

test("a foreign token contract is refused", () => {
  assert.throws(() => applyFtNotify(null, {
    firstReceiver: "fake.token",
    from: "alice",
    to: "pxblend",
    self: "pxblend",
    quantity: "100.0000 PXJ",
    memo: "blend:1",
  }), /fake token/);
});

test("a transfer that is not to the vault credits nothing", () => {
  const result = applyFtNotify(vault, {
    firstReceiver: "eosio.token",
    from: "alice",
    to: "bob",
    self: "pxblend",
    quantity: "1.0000 PXJ",
    memo: "blend:1",
  });
  assert.equal(result.credited, 0n);
  assert.equal(result.vault, vault);
});

test("an outgoing transfer from the vault credits nothing", () => {
  const result = applyFtNotify(vault, {
    firstReceiver: "eosio.token",
    from: "pxblend",
    to: "alice",
    self: "pxblend",
    quantity: "1.0000 PXJ",
    memo: "blend:1",
  });
  assert.equal(result.credited, 0n);
  assert.equal(result.vault, vault);
});

test("100.0000 PXJ is 1000000 units and a second symbol is refused", () => {
  const opened = applyFtNotify(null, {
    firstReceiver: "eosio.token",
    from: "alice",
    to: "pxblend",
    self: "pxblend",
    quantity: "100.0000 PXJ",
    memo: "blend:1",
  });
  assert.equal(opened.credited, 1000000n);
  assert.equal(opened.vault?.ft_symbol, "4,PXJ");
  assert.throws(() => applyFtNotify(opened.vault, {
    firstReceiver: "eosio.token",
    from: "alice",
    to: "pxblend",
    self: "pxblend",
    quantity: "1.00000000 WAX",
    memo: "blend:1",
  }), /mixed symbols/);
});

test("21 asset ids are refused and a foreign nft contract is refused", () => {
  const ids = Array.from({ length: 21 }, (_, i) => BigInt(i + 1));
  assert.throws(() => applyNftNotify(null, {
    firstReceiver: "atomicassets",
    from: "alice",
    to: "pxblend",
    self: "pxblend",
    assetIds: ids,
    templateIds: ids.map(() => 42),
    memo: "blend:1",
  }), /bad asset batch/);
  assert.throws(() => applyNftNotify(null, {
    firstReceiver: "fake.nft",
    from: "alice",
    to: "pxblend",
    self: "pxblend",
    assetIds: [1001n],
    templateIds: [42],
    memo: "blend:1",
  }), /fake nft/);
});

test("deposits then craft once, and the second craft is refused", () => {
  const paid = applyFtNotify(null, {
    firstReceiver: "eosio.token",
    from: "alice",
    to: "pxblend",
    self: "pxblend",
    quantity: "0.0100 PXJ",
    memo: "blend:1",
  });
  const held = applyNftNotify(paid.vault, {
    firstReceiver: "atomicassets",
    from: "alice",
    to: "pxblend",
    self: "pxblend",
    assetIds: [1001n],
    templateIds: [42],
    memo: "blend:1",
  });
  const once = craft("alice", held.vault, {
    id: 1,
    ft_required: 100n,
    ft_symbol: "4,PXJ",
    template_ids: [42],
  });
  assert.equal(once.vault.ft, 0n);
  assert.equal(once.vault.assets.length, 0);
  assert.equal(once.minted, null);
  assert.throws(() => craft("alice", once.vault, recipe), /non-positive FT/);
});
