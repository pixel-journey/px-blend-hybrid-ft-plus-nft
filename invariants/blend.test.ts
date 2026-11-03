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

const asset = (id: bigint, template_id: number, collection_name = COL) => ({ id, template_id, collection_name });

const recipe: Recipe = {
  id: 1,
  ft_required: ONE,
  ft_symbol: PXJ_SYMBOL,
  ft_contract: PXJ_CONTRACT,
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
    assets: [asset(1001n, 7)],
  }, recipe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "template mismatch");
});

test("the same template id in another collection is refused", () => {
  const result = canCraft("alice", {
    ...vault,
    assets: [asset(1001n, 42, "othercol")],
  }, recipe);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "wrong collection");
  assert.throws(() => craft("alice", {
    ...vault,
    assets: [asset(1001n, 42, "othercol")],
  }, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()]), /wrong collection/);
  assert.equal(vault.ft, ONE);
});

test("two required copies need two held assets", () => {
  const doubled = { ...recipe, template_ids: [42, 42] };
  assert.equal(canCraft("alice", vault, doubled).ok, false);
  assert.equal(canCraft("alice", {
    ...vault,
    assets: [asset(1001n, 42), asset(1002n, 42)],
  }, doubled).ok, true);
});

test("craft debits one PXJ and leaves the extra asset", () => {
  const held: Vault = {
    ...vault,
    ft: ONE + ONE / 2n,
    assets: [asset(1002n, 42), asset(1001n, 42), asset(9n, 7)],
  };
  const result = craft("alice", held, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()]);
  assert.equal(result.minted, null);
  assert.deepEqual(result.consumedIds, [1001n]);
  assert.equal(result.burns.length, 1);
  assert.equal(result.burns[0].sent, false);
  assert.equal(result.burns[0].name, "burnasset");
  assert.deepEqual(result.burns[0].data, { asset_owner: "pxblend", asset_id: "1001" });
  assert.equal(result.mint.sent, false);
  assert.equal(result.mint.name, "mintasset");
  assert.equal(result.mint.data.collection_name, COL);
  assert.equal(result.mint.data.schema_name, "examplesch");
  assert.equal(result.mint.data.template_id, 7);
  assert.equal(result.mint.data.new_asset_owner, "alice");
  assert.equal("asset_id" in result.mint.data, false);
  assert.equal(result.ftSpent, ONE);
  assert.equal(result.vault.ft, ONE / 2n);
  assert.deepEqual(result.vault.assets.map((item) => item.id), [1002n, 9n]);
  assert.equal(held.ft, ONE + ONE / 2n);
});

test("a refused craft does not debit", () => {
  assert.throws(() => craft("alice", vault, { ...recipe, template_ids: [9] }, "pxblend", collection(), outputTemplate(), [burnedTemplate()]), /template mismatch/);
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
  }, null), /bad asset batch/);
  assert.throws(() => applyNftNotify(null, {
    firstReceiver: "fake.nft",
    from: "alice",
    to: "pxblend",
    self: "pxblend",
    assetIds: [1001n],
    templateIds: [42],
    memo: "blend:1",
  }, [row(1001n)]), /fake nft/);
});

test("a deposit without a chain row is refused", () => {
  assert.throws(() => applyNftNotify(null, nft([1001n], [42]), null), /not chain sourced/);
  assert.throws(() => applyNftNotify(null, nft([1001n], [42]), []), /not chain sourced/);
});

test("a client template that disagrees with the chain row is refused", () => {
  assert.throws(() => applyNftNotify(null, nft([1001n], [42]), [row(1001n, 7)]), /template mismatch/);
});

test("a pre-transfer owner is refused", () => {
  assert.throws(() => applyNftNotify(null, nft([1001n], [42]), [row(1001n, 42, "alice")]), /stale owner/);
  assert.throws(() => applyNftNotify(null, nft([1001n], [42]), [row(1001n, 42, "bob")]), /not the owner/);
});

test("the credited template and collection come from the chain row", () => {
  const held = applyNftNotify(null, nft([1001n], [42]), [row(1001n)]);
  assert.deepEqual(held.credited, [1001n]);
  assert.equal(held.vault?.assets[0].template_id, 42);
  assert.equal(held.vault?.assets[0].collection_name, COL);
});

test("deposits then craft once, and the second craft is refused", () => {
  const paid = applyFtNotify(null, pxj("1.00000000 PXJ"));
  const held = applyNftNotify(paid.vault, nft([1001n], [42]), [row(1001n)]);
  const once = craft("alice", held.vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()]);
  assert.equal(once.vault.ft, 0n);
  assert.equal(once.vault.assets.length, 0);
  assert.equal(once.minted, null);
  assert.equal(once.burns[0].sent, false);
  assert.equal(once.mint.sent, false);
  assert.throws(() => craft("alice", once.vault, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()]), /non-positive FT/);
});

test("the owner withdraws the leftover half PXJ and it is not sent", () => {
  const crafted = craft("alice", { ...vault, ft: ONE + ONE / 2n, assets: [
    asset(1001n, 42),
    asset(9n, 7),
  ] }, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()]);
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
    assets: [asset(1001n, 42), asset(9n, 7)],
  }, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()]);
  assert.throws(() => withdrawNfts("alice", crafted.vault, [1001n], "pxblend"), /missing asset/);
  const out = withdrawNfts("alice", crafted.vault, [9n], "pxblend");
  assert.equal(out.action.sent, false);
  assert.equal(out.action.account, "atomicassets");
  assert.deepEqual(out.action.data.asset_ids, ["9"]);
  assert.equal(out.vault.assets.length, 0);
});

test("two consumed assets become two unsent burns and PXJ is not burned", () => {
  const result = craft("alice", {
    ...vault,
    assets: [asset(1002n, 42), asset(1001n, 42)],
  }, { ...recipe, template_ids: [42, 42] }, "pxblend", collection(), outputTemplate(), [burnedTemplate()]);
  assert.deepEqual(result.consumedIds, [1001n, 1002n]);
  assert.deepEqual(result.burns.map((burn) => burn.data.asset_id), ["1001", "1002"]);
  assert.equal(result.burns.every((burn) => burn.sent === false), true);
  assert.equal(result.mint.sent, false);
  assert.equal(result.burns.some((burn) => burn.account === "pixeljourney"), false);
  assert.equal(result.mint.account, "atomicassets");
});

test("a bad output collection is refused before any burn", () => {
  const result = canCraft("alice", vault, { ...recipe, output_collection: ".bad" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "bad name");
});

test("a craft with no collection row does not debit", () => {
  const before = vault.ft;
  assert.throws(() => craft("alice", vault, recipe, "pxblend", null, outputTemplate(), [burnedTemplate()]), /not chain sourced/);
  assert.throws(() => craft("alice", vault, recipe, "pxblend", collection(), null, [burnedTemplate()]), /not chain sourced/);
  assert.equal(vault.ft, before);
});

test("a contract that is not the author and not authorized does not debit", () => {
  const before = vault.ft;
  assert.throws(() => craft(
    "alice",
    vault,
    recipe,
    "pxblend",
    collection([], "someoneelse"),
    outputTemplate(),
    [burnedTemplate()],
  ), /not a minter/);
  assert.equal(vault.ft, before);
  const asAuthor = craft("alice", vault, recipe, "pxblend", collection([], "pxblend"), outputTemplate(), [burnedTemplate()]);
  assert.equal(asAuthor.mint.sent, false);
  assert.equal(asAuthor.mint.data.authorized_minter, "pxblend");
  assert.equal(asAuthor.ftSpent, ONE);
});

test("a full template does not debit and issued supply stays put", () => {
  const full = outputTemplate({ max_supply: 10, issued_supply: 10 });
  assert.throws(() => craft("alice", vault, recipe, "pxblend", collection(), full, [burnedTemplate()]), /template full/);
  assert.equal(full.issued_supply, 10);
  assert.equal(vault.ft, ONE);
  const open = outputTemplate({ max_supply: 0, issued_supply: 100 });
  const result = craft("alice", vault, recipe, "pxblend", collection(), open, [burnedTemplate()]);
  assert.equal(result.minted, null);
  assert.equal(open.issued_supply, 100);
});

test("a template schema that disagrees with the recipe does not debit", () => {
  assert.throws(() => craft(
    "alice",
    vault,
    recipe,
    "pxblend",
    collection(),
    outputTemplate({ schema_name: "othersch" }),
    [burnedTemplate()],
  ), /wrong schema/);
  assert.equal(vault.ft, ONE);
});

test("an unburnable ingredient does not debit", () => {
  assert.throws(() => craft(
    "alice",
    vault,
    recipe,
    "pxblend",
    collection(),
    outputTemplate(),
    [burnedTemplate(42, false)],
  ), /not burnable/);
  assert.equal(vault.ft, ONE);
});

test("a missing ingredient template row does not debit", () => {
  assert.throws(() => craft(
    "alice",
    vault,
    recipe,
    "pxblend",
    collection(),
    outputTemplate(),
    null,
  ), /not chain sourced/);
  const held = {
    ...vault,
    assets: [asset(1001n, 42), asset(9n, 7)],
  };
  const both = { ...recipe, template_ids: [42, 7] };
  assert.throws(() => craft(
    "alice",
    held,
    both,
    "pxblend",
    collection(),
    outputTemplate(),
    [burnedTemplate(42)],
  ), /not chain sourced/);
  const result = craft(
    "alice",
    held,
    both,
    "pxblend",
    collection(),
    outputTemplate(),
    [burnedTemplate(42), burnedTemplate(7)],
  );
  assert.deepEqual(result.consumedIds, [9n, 1001n]);
  assert.equal(result.burns.length, 2);
  assert.equal(result.burns.every((burn) => burn.sent === false), true);
  assert.equal(held.ft, ONE);
});
