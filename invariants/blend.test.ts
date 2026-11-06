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
  type ChainAsset,
  type ChainCollection,
  type ChainTemplate,
  type Recipe,
  type Vault,
} from "./blend.ts";

const ONE = 100_000_000n;
const COL = "examplecol";
const SINK = "craft.pxj";

const asset = (id: bigint, template_id: number, collection_name = COL) => ({ id, template_id, collection_name });

const recipe: Recipe = {
  id: 1,
  ft_required: ONE,
  ft_symbol: PXJ_SYMBOL,
  ft_contract: PXJ_CONTRACT,
  ft_sink: SINK,
  template_ids: [42],
  ingredient_collection: COL,
  output_collection: COL,
  output_schema: "examplesch",
  output_template_id: 7,
};

const vault: Vault = {
  user: "alice",
  ft: ONE,
  ft_symbol: PXJ_SYMBOL,
  ft_contract: PXJ_CONTRACT,
  assets: [asset(1001n, 42)],
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

const row = (
  id: bigint,
  template_id = 42,
  owner = "pxblend",
  collection_name = COL,
): ChainAsset => ({ source: "chain", id, owner, collection_name, template_id });

const collection = (authorized: string[] = ["pxblend"], author = "authorname"): ChainCollection => ({
  source: "chain",
  collection_name: COL,
  author,
  authorized_accounts: authorized,
});

const outputTemplate = (over: Partial<ChainTemplate> = {}): ChainTemplate => ({
  source: "chain",
  collection_name: COL,
  schema_name: "examplesch",
  template_id: 7,
  burnable: true,
  max_supply: 0,
  issued_supply: 3,
  ...over,
});

const burnedTemplate = (template_id = 42, burnable = true, collection_name = COL): ChainTemplate => ({
  source: "chain",
  collection_name,
  schema_name: "ingredsch",
  template_id,
  burnable,
  max_supply: 0,
  issued_supply: 0,
});

const nft = (ids: bigint[], templates: number[]) => ({
  firstReceiver: "atomicassets",
  from: "alice",
  to: "pxblend",
  self: "pxblend",
  assetIds: ids,
  templateIds: templates,
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

test("craft returns an unsent sink transfer for spent PXJ", () => {
  const result = craft("alice", vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()]);
  assert.equal(result.ftSpent, ONE);
  assert.equal(result.ftSink.sent, false);
  assert.equal(result.ftSink.account, "pixeljourney");
  assert.equal(result.ftSink.data.to, SINK);
  assert.equal(result.ftSink.data.quantity, "1.00000000 PXJ");
  assert.equal(result.minted, null);
});

test("a refused craft does not debit", () => {
  assert.throws(() => craft("alice", vault, { ...recipe, template_ids: [9] }, "pxblend", collection(), outputTemplate(), [burnedTemplate()]), /template mismatch/);
  assert.equal(vault.ft, ONE);
});

test("1.00000000 PXJ is 100000000 units", () => {
  const opened = applyFtNotify(null, pxj("1.00000000 PXJ"));
  assert.equal(opened.credited, ONE);
  assert.equal(opened.vault?.ft_symbol, "8,PXJ");
});

test("eosio.token cannot deliver PXJ", () => {
  assert.throws(() => applyFtNotify(null, {
    ...pxj("1.00000000 PXJ"),
    firstReceiver: "eosio.token",
  }), /fake token/);
});

test("four-decimal PXJ is refused", () => {
  assert.throws(() => applyFtNotify(null, pxj("1.0000 PXJ")), /pxj precision/);
});

test("an unburnable ingredient does not debit", () => {
  assert.throws(() => craft(
    "alice", vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate(42, false)],
  ), /not burnable/);
  assert.equal(vault.ft, ONE);
});

test("orders burns, PXJ sink, then mint in actions", () => {
  const result = craft("alice", vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()]);
  assert.equal(result.actions.length, 3);
  assert.equal(result.actions.every((a) => a.sent === false), true);
  assert.equal(result.actions[0].name, "burnasset");
  assert.equal(result.actions[1].name, "transfer");
  assert.equal(result.actions[1], result.ftSink);
  assert.equal(result.actions[2].name, "mintasset");
  assert.equal(result.actions[2], result.mint);
  assert.equal(result.minted, null);
});

test("PXJ recipe on a non-pixeljourney contract is refused", () => {
  const bad = { ...recipe, ft_contract: "eosio.token" };
  const badVault = { ...vault, ft_contract: "eosio.token" };
  const result = canCraft("alice", badVault, bad);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /pxj contract/);
});

test("eosio.token cannot credit 8-decimal PXJ", () => {
  assert.throws(() => applyFtNotify(null, {
    firstReceiver: "eosio.token",
    tokenContract: "eosio.token",
    from: "alice",
    to: "pxblend",
    self: "pxblend",
    quantity: "1.00000000 PXJ",
    memo: "blend:1",
  }), /pxj contract/);
});

test("a PXJ contract mismatch does not debit", () => {
  const bad = { ...recipe, ft_contract: "eosio.token" };
  const badVault = { ...vault, ft_contract: "eosio.token" };
  assert.throws(
    () => craft("alice", badVault, bad, "pxblend", collection(), outputTemplate(), [burnedTemplate()]),
    /pxj contract/,
  );
  assert.equal(vault.ft, ONE);
});
