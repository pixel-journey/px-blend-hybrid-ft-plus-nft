import assert from "node:assert/strict";
import test from "node:test";
import {
  PXJ_CONTRACT,
  PXJ_SYMBOL,
  applyFtNotify,
  canCraft,
  craft,
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

const chainAssets = (ids: bigint[] = [1001n]): ChainAsset[] =>
  ids.map((id) => row(id));

const goodCraft = () =>
  craft("alice", vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()], chainAssets());

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

test("the same template id in another collection is wrong collection", () => {
  const held = { ...vault, assets: [asset(1001n, 42, "othercol")] };
  const result = canCraft("alice", held, recipe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /wrong collection/);
});

test("craft returns an unsent sink transfer for spent PXJ", () => {
  const result = goodCraft();
  assert.equal(result.ftSpent, ONE);
  assert.equal(result.ftSink.sent, false);
  assert.equal(result.ftSink.account, "pixeljourney");
  assert.equal(result.ftSink.data.to, SINK);
  assert.equal(result.ftSink.data.quantity, "1.00000000 PXJ");
  assert.equal(result.minted, null);
});

test("a refused craft does not debit", () => {
  assert.throws(() => craft("alice", vault, { ...recipe, template_ids: [9] }, "pxblend", collection(), outputTemplate(), [burnedTemplate()], chainAssets()), /template mismatch/);
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
    "alice", vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate(42, false)], chainAssets(),
  ), /not burnable/);
  assert.equal(vault.ft, ONE);
});

test("orders burns, PXJ sink, then mint in actions", () => {
  const result = goodCraft();
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
    () => craft("alice", badVault, bad, "pxblend", collection(), outputTemplate(), [burnedTemplate()], chainAssets()),
    /pxj contract/,
  );
  assert.equal(vault.ft, ONE);
});

test("refuses a missing chain asset list before any action body", () => {
  assert.throws(
    () => craft("alice", vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()], null),
    /not chain sourced/,
  );
  assert.equal(vault.ft, ONE);
});

test("refuses an empty chain asset list when one id is consumed", () => {
  assert.throws(
    () => craft("alice", vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()], []),
    /not chain sourced/,
  );
  assert.equal(vault.ft, ONE);
});

test("refuses a chain asset owned by someone else", () => {
  assert.throws(
    () => craft("alice", vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()], [row(1001n, 42, "alice")]),
    /not the owner/,
  );
  assert.equal(vault.ft, ONE);
});

test("refuses a chain asset from the wrong collection", () => {
  assert.throws(
    () => craft("alice", vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()], [row(1001n, 42, "pxblend", "othercol")]),
    /wrong collection/,
  );
  assert.equal(vault.ft, ONE);
});

test("refuses a chain asset whose template disagrees with the book", () => {
  assert.throws(
    () => craft("alice", vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()], [row(1001n, 99)]),
    /template mismatch/,
  );
  assert.equal(vault.ft, ONE);
});

test("craft debits one PXJ and leaves the extra asset", () => {
  const held: Vault = {
    ...vault,
    ft: ONE + ONE / 2n,
    assets: [asset(1002n, 42), asset(1001n, 42), asset(9n, 7)],
  };
  const result = craft(
    "alice", held, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()],
    [row(1001n)],
  );
  assert.equal(result.ftSpent, ONE);
  assert.equal(result.vault.ft, ONE / 2n);
  assert.deepEqual(result.consumedIds, [1001n]);
  assert.deepEqual(result.vault.assets.map((a) => a.id), [1002n, 9n]);
  assert.equal(result.burns.length, 1);
  assert.equal(result.burns[0].data.asset_id, "1001");
  assert.equal(result.minted, null);
});

test("two required templates burn both lowest matching ids", () => {
  const two: Recipe = { ...recipe, template_ids: [42, 42] };
  const held: Vault = {
    ...vault,
    assets: [asset(1002n, 42), asset(1001n, 42), asset(1003n, 42)],
  };
  const result = craft(
    "alice", held, two, "pxblend", collection(), outputTemplate(), [burnedTemplate()],
    [row(1001n), row(1002n)],
  );
  assert.deepEqual(result.consumedIds, [1001n, 1002n]);
  assert.equal(result.burns.length, 2);
  assert.equal(result.actions.length, 4);
  assert.equal(result.actions[0].name, "burnasset");
  assert.equal(result.actions[1].name, "burnasset");
  assert.equal(result.actions[2].name, "transfer");
  assert.equal(result.actions[3].name, "mintasset");
  assert.equal(result.vault.assets.length, 1);
  assert.equal(result.vault.assets[0].id, 1003n);
});

test("a full output template does not debit", () => {
  assert.throws(
    () => craft(
      "alice", vault, recipe, "pxblend", collection(),
      outputTemplate({ max_supply: 10, issued_supply: 10 }),
      [burnedTemplate()], chainAssets(),
    ),
    /template full/,
  );
  assert.equal(vault.ft, ONE);
});

test("a contract that is not a minter does not debit", () => {
  assert.throws(
    () => craft(
      "alice", vault, recipe, "pxblend",
      collection([], "someoneelse"),
      outputTemplate(), [burnedTemplate()], chainAssets(),
    ),
    /not a minter/,
  );
  assert.equal(vault.ft, ONE);
});
