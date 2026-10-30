# px-blend-hybrid-ft-plus-nft

Private. The tested rule uses PXJ at 8 decimals from `pixeljourney`. Craft debits the book and returns one unsent `burnasset` per consumed id plus one unsent `mintasset`. It does not mint.

## What is true

`get_currency_stats` for `pixeljourney` / `PXJ` on 2026-10-30 returned `10000000000.00000000 PXJ` as max supply. The issuer is `pixeljourney`. `eosio.token` has no PXJ stat.

`npm test` runs `invariants/blend.test.ts`.

- `1.00000000 PXJ` is 100000000 units. `1.0000 PXJ` is refused.
- A notify credits PXJ only when the first receiver is `pixeljourney`. `eosio.token` is refused.
- Owner, symbol `8,PXJ`, that contract, and enough of each required template may craft.
- Non-owner, missing vault, unknown recipe, non-positive FT, insufficient FT, and a template mismatch are refused.
- Craft spends the required amount and the lowest asset id of each required template. Extra FT and other assets stay. Each consumed id gets an unsent `atomicassets::burnasset` whose `asset_owner` is the vault. One unsent `atomicassets::mintasset` names the recipe's output collection, schema, and template. It has no asset id. `minted` is null. PXJ is debited, not burned. `examplecol` and `examplesch` are example names, not a live collection.
- Withdraw of the leftover returns a `pixeljourney::transfer` or `atomicassets::transfer` body with `sent: false`. A consumed asset id is missing. The input vault is unchanged.
- A batch of 21 asset ids is refused. A second symbol on the same vault is refused.

`contracts/src/px_hybrid_blend.cpp` still notifies `eosio.token` and still stops before the template match. `cdt-cpp` was not run. There is no wasm.

`client/wharfkit-demo.ts` is not part of `npm test`. Calling it would broadcast, and it still addresses `eosio.token`.

## Run

```bash
npm test
```

No host is called by the tests. The currency stat above was a read, not a transfer.

Do not deploy the sketch.
