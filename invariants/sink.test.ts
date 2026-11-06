import assert from "node:assert/strict";
import test from "node:test";
import {
  PXJ_CONTRACT,
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

const asset = (id: bigint, template_id: number) => ({ id, template_id, collection_name: COL });

const recipe: Recipe = {
  id: 1,
  ft_required: ONE,
  ft_symbol: "8,PXJ",
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
  ft_symbol: "8,PXJ",
  ft_contract: PXJ_CONTRACT,
  assets: [asset(1001n, 42)],
};

const collection = (): ChainCollection => ({
  source: "chain",
  collection_name: COL,
  author: "authorname",
  authorized_accounts: ["pxblend"],
});

const outputTemplate = (): ChainTemplate => ({
  source: "chain",
  collection_name: COL,
  schema_name: "examplesch",
  template_id: 7,
  burnable: true,
  max_supply: 0,
  issued_supply: 3,
});

const burnedTemplate = (): ChainTemplate => ({
  source: "chain",
  collection_name: COL,
  schema_name: "ingredsch",
  template_id: 42,
  burnable: true,
  max_supply: 0,
  issued_supply: 0,
});

const chainAssets = (ids: bigint[] = [1001n]): ChainAsset[] =>
  ids.map((id) => ({
    source: "chain",
    id,
    owner: "pxblend",
    collection_name: COL,
    template_id: 42,
  }));

test("spent PXJ goes to the sink and is not sent", () => {
  const held = { ...vault, ft: ONE + ONE / 2n };
  const result = craft("alice", held, recipe, "pxblend", collection(), outputTemplate(), [burnedTemplate()], chainAssets());
  assert.equal(result.ftSpent, ONE);
  assert.equal(result.vault.ft + result.ftSpent, held.ft);
  assert.equal(result.ftSink.sent, false);
  assert.equal(result.ftSink.account, PXJ_CONTRACT);
  assert.equal(result.ftSink.data.from, "pxblend");
  assert.equal(result.ftSink.data.to, SINK);
  assert.equal(result.ftSink.data.quantity, "1.00000000 PXJ");
  assert.equal(result.ftSink.data.memo, "craft:1");
});

test("a sink that is the vault or the caller does not debit", () => {
  assert.throws(() => craft(
    "alice", vault, { ...recipe, ft_sink: "pxblend" }, "pxblend",
    collection(), outputTemplate(), [burnedTemplate()], chainAssets(),
  ), /sink is self/);
  assert.throws(() => craft(
    "alice", vault, { ...recipe, ft_sink: "alice" }, "pxblend",
    collection(), outputTemplate(), [burnedTemplate()], chainAssets(),
  ), /sink is the user/);
  assert.equal(vault.ft, ONE);
});

test("a bad sink name is refused", () => {
  const result = canCraft("alice", vault, { ...recipe, ft_sink: ".bad" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "bad name");
});
