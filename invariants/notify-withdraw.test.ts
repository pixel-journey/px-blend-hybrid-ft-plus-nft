import assert from "node:assert/strict";
import test from "node:test";
import {
  PXJ_CONTRACT,
  PXJ_SYMBOL,
  applyNftNotify,
  withdrawFt,
  withdrawNfts,
  type ChainAsset,
  type Vault,
} from "./blend.ts";

const ONE = 100_000_000n;
const COL = "examplecol";

const asset = (id: bigint, template_id: number, collection_name = COL) => ({
  id,
  template_id,
  collection_name,
});

const vault: Vault = {
  user: "alice",
  ft: ONE,
  ft_symbol: PXJ_SYMBOL,
  ft_contract: PXJ_CONTRACT,
  assets: [asset(1001n, 42), asset(9n, 7)],
};

const chainRow = (
  id: bigint,
  template_id: number,
  owner: string,
  collection_name = COL,
): ChainAsset => ({
  source: "chain",
  id,
  owner,
  collection_name,
  template_id,
});

const nftNote = (over: Record<string, unknown> = {}) => ({
  firstReceiver: "atomicassets",
  from: "alice",
  to: "pxblend",
  self: "pxblend",
  assetIds: [2001n],
  templateIds: [42],
  memo: "blend:1",
  ...over,
});

test("NFT notify credits from a chain row owned by the vault", () => {
  const chain = [chainRow(2001n, 42, "pxblend")];
  const result = applyNftNotify(null, nftNote(), chain);
  assert.deepEqual(result.credited, [2001n]);
  assert.equal(result.vault?.user, "alice");
  assert.equal(result.vault?.assets[0].template_id, 42);
  assert.equal(result.vault?.assets[0].collection_name, COL);
});

test("a pre-transfer owner is refused as stale", () => {
  const chain = [chainRow(2001n, 42, "alice")];
  assert.throws(() => applyNftNotify(null, nftNote(), chain), /stale owner/);
});

test("a third-party owner is refused", () => {
  const chain = [chainRow(2001n, 42, "bob")];
  assert.throws(() => applyNftNotify(null, nftNote(), chain), /not the owner/);
});

test("a client template that disagrees with the chain row is refused", () => {
  const chain = [chainRow(2001n, 7, "pxblend")];
  assert.throws(
    () => applyNftNotify(null, nftNote({ templateIds: [42] }), chain),
    /template mismatch/,
  );
});

test("fake nft first receiver is refused", () => {
  assert.throws(
    () => applyNftNotify(null, nftNote({ firstReceiver: "fakenft" }), null),
    /fake nft/,
  );
});

test("a batch of 21 asset ids is refused before the chain check", () => {
  const ids = Array.from({ length: 21 }, (_, i) => BigInt(3000 + i));
  const tmpls = ids.map(() => 42);
  assert.throws(
    () =>
      applyNftNotify(
        null,
        nftNote({ assetIds: ids, templateIds: tmpls }),
        null,
      ),
    /bad asset batch/,
  );
});

test("missing chain rows on NFT notify are refused", () => {
  assert.throws(() => applyNftNotify(null, nftNote(), null), /not chain sourced/);
  assert.throws(() => applyNftNotify(null, nftNote(), []), /not chain sourced/);
});

test("withdrawFt returns an unsent transfer for the leftover", () => {
  const held = { ...vault, ft: ONE / 2n, assets: vault.assets.slice() };
  const result = withdrawFt("alice", held, ONE / 2n, "pxblend");
  assert.equal(result.vault.ft, 0n);
  assert.equal(result.action.sent, false);
  assert.equal(result.action.account, PXJ_CONTRACT);
  assert.equal(result.action.data.from, "pxblend");
  assert.equal(result.action.data.to, "alice");
  assert.equal(result.action.data.quantity, "0.50000000 PXJ");
  assert.equal(held.ft, ONE / 2n);
});

test("non-owner cannot withdraw FT", () => {
  assert.throws(() => withdrawFt("bob", vault, 1n, "pxblend"), /not the owner/);
  assert.equal(vault.ft, ONE);
});

test("withdrawNfts of a held id returns an unsent transfer", () => {
  const result = withdrawNfts("alice", vault, [9n], "pxblend");
  assert.equal(result.action.sent, false);
  assert.equal(result.action.account, "atomicassets");
  assert.deepEqual(result.action.data.asset_ids, ["9"]);
  assert.equal(result.vault.assets.length, 1);
  assert.equal(result.vault.assets[0].id, 1001n);
  assert.equal(vault.assets.length, 2);
});

test("withdrawNfts of a missing id is refused", () => {
  assert.throws(() => withdrawNfts("alice", vault, [9999n], "pxblend"), /missing asset/);
  assert.equal(vault.assets.length, 2);
});
