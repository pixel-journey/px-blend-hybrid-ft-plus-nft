# px-blend-hybrid-ft-plus-nft

Private. The tested rule uses PXJ at 8 decimals from `pixeljourney`. An NFT credit stores the template and collection from a chain row, not from the client. Craft debits only when chain rows say this contract may mint the output template and each ingredient template is burnable. Spent PXJ is an unsent transfer to `ft_sink`, not a burn. Burn and mint bodies are unsent. It does not mint.

## What is true

`get_currency_stats` for `pixeljourney` / `PXJ` on 2026-10-30 returned `10000000000.00000000 PXJ` as max supply. The issuer is `pixeljourney`. `eosio.token` has no PXJ stat.

`npm test` runs `invariants/blend.test.ts`. The tests do not call a WAX node. A chain row is an argument. Omitting it is refused. That is not a live `atomicassets::assets` read.

- `1.00000000 PXJ` is 100000000 units. `1.0000 PXJ` is refused.
- A notify credits PXJ only when the first receiver is `pixeljourney`. `eosio.token` is refused.
- An NFT notify credits only when each id has a row with `source: "chain"`, the owner is already the vault, and the client's template id matches that row. The stored collection is the row's collection. A missing row, a pre-transfer owner, or a third-party owner is refused.
- Craft also requires a chain row for the output collection and a chain row for the output template. The vault must be the author or in `authorized_accounts`. The template's collection, schema, and id must match the recipe. `max_supply` of 0 means no cap. A full template is refused. `issued_supply` is not incremented. Each distinct ingredient template needs its own chain row in `ingredient_collection` with `burnable: true`. A false flag or a missing row is refused before the debit. No row is a live collections or templates read.
- Owner, symbol `8,PXJ`, that contract, and enough of each required template in `ingredient_collection` may craft. The same template id in another collection does not count. The ingredient gate does not itself check minter rights. `craft` does, and it throws before any debit.
- Non-owner, missing vault, unknown recipe, non-positive FT, insufficient FT, a template mismatch, and the wrong collection are refused.
- Craft spends the required amount and the lowest asset id of each required template in that collection. Extra FT and other assets stay. Each consumed id gets an unsent `atomicassets::burnasset` whose `asset_owner` is the vault. One unsent `atomicassets::mintasset` names the recipe's output collection, schema, and template. It has no asset id. `minted` is null. Spent PXJ is an unsent `pixeljourney::transfer` to `recipe.ft_sink` for exactly `ftSpent`. The sink cannot be the vault or the caller. `examplecol`, `examplesch`, and `craft.pxj` are example names, not a live claim.
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
