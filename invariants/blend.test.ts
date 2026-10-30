import assert from "node:assert/strict";
import test from "node:test";
import {
  PXJ_CONTRACT,
  PXJ_SYMBOL,
  applyFtNotify,
  applyNftNotify,
  canCraft,
  craft,
  withdrawFt,
  withdrawNfts,
  type Recipe,
  type Vault,
} from "./blend.ts";

const ONE = 100_000_000n;

const recipe: Recipe = {
  id: 1,
  ft_required: ONE,
  ft_symbol: PXJ_SYMBOL,
  ft_contract: PXJ_CONTRACT,
  template_ids: [42],
};

const vault: Vault = {
  user: "alice",
  ft: ONE,
  ft_symbol: PXJ_SYMBOL,
  ft_contract: PXJ_CONTRACT,
  assets: [{ id: 1001n, template_id: 42 }],
};

const pxj = (quantity: string) => ({
  firstReceiver: PXJ_CONTRACT,
  tokenContract: PXJ_CONTRACT,
  from: "alice",
  to: "pxblend",
  self: "pxblend",
  quantity,
  memo: "blend:1",
});

test("owner with sufficient ingredients may craft", () => {
  assert.equal(canCraft("alice", vault, recipe).ok, true);
});

test("non-owner is refused", () => {
  const result = canCraft("bob", vault, recipe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /owner/);
});

test("insufficient FT is refused", () => {
  const result = canCraft("alice", { ...vault, ft: ONE / 2n }, recipe);
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

test("four-decimal PXJ is refused", () => {
  assert.equal(canCraft("alice", { ...vault, ft_symbol: "4,PXJ" }, recipe).ok, false);
  assert.throws(() => applyFtNotify(null, pxj("1.0000 PXJ")), /pxj precision/);
  assert.throws(() => applyFtNotify(null, pxj("100.0000 PXJ")), /pxj precision/);
});

test("eosio.token cannot deliver PXJ", () => {
  assert.throws(() => applyFtNotify(null, {
    ...pxj("1.00000000 PXJ"),
    firstReceiver: "eosio.token",
  }), /fake token/);
});

test("1.00000000 PXJ is 100000000 units", () => {
  const opened = applyFtNotify(null, pxj("1.00000000 PXJ"));
  assert.equal(opened.credited, ONE);
  assert.equal(opened.vault?.ft_symbol, "8,PXJ");
  assert.equal(opened.vault?.ft_contract, "pixeljourney");
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
  assert.equal(canCraft("alice", {
    ...vault,
    assets: [
      { id: 1001n, template_id: 42 },
      { id: 1002n, template_id: 42 },
    ],
  }, doubled).ok, true);
});

test("craft debits one PXJ and leaves the extra asset", () => {
  const held: Vault = {
    ...vault,
    ft: ONE + ONE / 2n,
    assets: [
      { id: 1002n, template_id: 42 },
      { id: 1001n, template_id: 42 },
      { id: 9n, template_id: 7 },
    ],
  };
  const result = craft("alice", held, recipe);
  assert.equal(result.minted, null);
  assert.deepEqual(result.consumedIds, [1001n]);
  assert.equal(result.ftSpent, ONE);
  assert.equal(result.vault.ft, ONE / 2n);
  assert.deepEqual(result.vault.assets.map((asset) => asset.id), [1002n, 9n]);
  assert.equal(held.ft, ONE + ONE / 2n);
});

test("a refused craft does not debit", () => {
  assert.throws(() => craft("alice", vault, { ...recipe, template_ids: [9] }), /template mismatch/);
  assert.equal(vault.ft, ONE);
});

test("a transfer that is not to the vault credits nothing", () => {
  const result = applyFtNotify(vault, { ...pxj("1.00000000 PXJ"), to: "bob" });
  assert.equal(result.credited, 0n);
  assert.equal(result.vault, vault);
});

test("an outgoing transfer from the vault credits nothing", () => {
  const result = applyFtNotify(vault, { ...pxj("1.00000000 PXJ"), from: "pxblend" });
  assert.equal(result.credited, 0n);
  assert.equal(result.vault, vault);
});

test("a second symbol is refused", () => {
  assert.throws(() => applyFtNotify(vault, {
    ...pxj("1.00000000 WAX"),
    tokenContract: "eosio.token",
    firstReceiver: "eosio.token",
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
  const paid = applyFtNotify(null, pxj("1.00000000 PXJ"));
  const held = applyNftNotify(paid.vault, {
    firstReceiver: "atomicassets",
    from: "alice",
    to: "pxblend",
    self: "pxblend",
    assetIds: [1001n],
    templateIds: [42],
    memo: "blend:1",
  });
  const once = craft("alice", held.vault, recipe);
  assert.equal(once.vault.ft, 0n);
  assert.equal(once.vault.assets.length, 0);
  assert.equal(once.minted, null);
  assert.throws(() => craft("alice", once.vault, recipe), /non-positive FT/);
});

test("the owner withdraws the leftover half PXJ and it is not sent", () => {
  const crafted = craft("alice", { ...vault, ft: ONE + ONE / 2n, assets: [
    { id: 1001n, template_id: 42 },
    { id: 9n, template_id: 7 },
  ] }, recipe);
  const out = withdrawFt("alice", crafted.vault, ONE / 2n, "pxblend");
  assert.equal(out.action.sent, false);
  assert.equal(out.action.account, "pixeljourney");
  assert.equal(out.action.data.quantity, "0.50000000 PXJ");
  assert.equal(out.action.data.from, "pxblend");
  assert.equal(out.action.data.to, "alice");
  assert.equal(out.vault.ft, 0n);
  assert.equal(crafted.vault.ft, ONE / 2n);
  assert.throws(() => withdrawFt("bob", crafted.vault, ONE / 2n, "pxblend"), /owner/);
  assert.throws(() => withdrawFt("alice", crafted.vault, ONE, "pxblend"), /insufficient/);
});

test("a consumed asset cannot be withdrawn and the leftover can", () => {
  const crafted = craft("alice", {
    ...vault,
    assets: [
      { id: 1001n, template_id: 42 },
      { id: 9n, template_id: 7 },
    ],
  }, recipe);
  assert.throws(() => withdrawNfts("alice", crafted.vault, [1001n], "pxblend"), /missing asset/);
  const out = withdrawNfts("alice", crafted.vault, [9n], "pxblend");
  assert.equal(out.action.sent, false);
  assert.equal(out.action.account, "atomicassets");
  assert.deepEqual(out.action.data.asset_ids, ["9"]);
  assert.equal(out.vault.assets.length, 0);
});
