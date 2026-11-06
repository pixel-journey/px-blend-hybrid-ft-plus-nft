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

const asset = (id: bigint, template_id: number) => ({
  id,
  template_id,
  collection_name: COL,
});

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

const pxj = (quantity: string, over: Record<string, unknown> = {}) => ({
  firstReceiver: PXJ_CONTRACT,
  tokenContract: PXJ_CONTRACT,
  from: "alice",
  to: "pxblend",
  self: "pxblend",
  quantity,
  memo: "blend:1",
  ...over,
});

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

const chainAssets = (): ChainAsset[] => [
  { source: "chain", id: 1001n, owner: "pxblend", collection_name: COL, template_id: 42 },
];

test("empty recipe is refused by canCraft", () => {
  const result = canCraft("alice", vault, { ...recipe, template_ids: [] });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /empty recipe/);
});

test("empty recipe does not debit in craft", () => {
  assert.throws(
    () =>
      craft(
        "alice",
        vault,
        { ...recipe, template_ids: [] },
        "pxblend",
        collection(),
        outputTemplate(),
        [],
        chainAssets(),
      ),
    /empty recipe/,
  );
  assert.equal(vault.ft, ONE);
});

test("FT notify memo must start with blend:", () => {
  assert.throws(
    () => applyFtNotify(null, pxj("1.00000000 PXJ", { memo: "deposit" })),
    /memo must start with blend:/,
  );
});

test("a second symbol on an existing PXJ vault is refused", () => {
  const opened = applyFtNotify(null, pxj("1.00000000 PXJ"));
  assert.ok(opened.vault);
  assert.throws(
    () =>
      applyFtNotify(opened.vault, {
        firstReceiver: "eosio.token",
        tokenContract: "eosio.token",
        from: "alice",
        to: "pxblend",
        self: "pxblend",
        quantity: "1.0000 WAX",
        memo: "blend:1",
      }),
    /mixed symbols/,
  );
});

test("outgoing FT transfer credits nothing", () => {
  const result = applyFtNotify(vault, pxj("1.00000000 PXJ", { from: "pxblend", to: "alice" }));
  assert.equal(result.credited, 0n);
  assert.equal(result.vault?.ft, ONE);
});

test("self-to-self FT transfer credits nothing", () => {
  const result = applyFtNotify(vault, pxj("1.00000000 PXJ", { from: "pxblend", to: "pxblend" }));
  assert.equal(result.credited, 0n);
});

test("non-positive FT quantity is refused", () => {
  assert.throws(
    () => applyFtNotify(null, pxj("0.00000000 PXJ")),
    /non-positive FT/,
  );
});
