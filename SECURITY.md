# Security notes — hybrid FT + NFT blend

## Authorization

- Only the user on the vault may craft it or withdraw from it.
- A notify credits only when `from` is that user. A different `from` is refused.
- An NFT credit requires a chain row per asset id. The owner on that row must already be this contract, which is what `atomicassets::transfer` writes before `require_recipient`. The sender as owner is a stale read and is refused. A third-party owner is refused.
- A craft requires a chain row for the output collection and one for the output template. This contract must be the author or listed in `authorized_accounts`. The template must match the recipe's collection, schema, and id, and must not be at a non-zero max supply. Each distinct ingredient template needs a chain row with `burnable` true in the ingredient collection. The tests do not call AtomicAssets. A missing row is refused. `issued_supply` is not changed.
- **Craft also requires one chain asset row per consumed id.** The vault book is not ownership proof. Owner must be the vault, collection and template must match the book. A null list, a row owned by the user, or a row from another collection is refused before any debit.

## Inputs

- PXJ must arrive from `pixeljourney` with precision 8. `1.0000 PXJ` is refused. `eosio.token` is the wrong contract for PXJ. A recipe that claims `8,PXJ` on any other contract is refused (`pxj contract`).
- The first credit sets the symbol and the contract. A later credit in another symbol or contract is refused.
- At most 20 asset ids per notify. Ids must be unique, including ids already in the vault.
- The stored template and collection come from the chain row. A client template that disagrees is refused and nothing is credited.
- Template counts must cover the recipe inside `ingredient_collection`. The same template id in another collection does not count. Extra held assets do not have to be part of the recipe.
- Withdraw cannot take more FT than the balance, and cannot take an asset id that is not still in the book.

## Atomicity

`craft` either returns a vault with the FT and the matched assets removed, plus unsent burn, sink, and mint bodies in order, or throws before returning. `minted` stays null. Withdraw and those AtomicAssets bodies set `sent` to false. Nothing in `npm test` broadcasts.

## What the tested rule covers

`npm test` runs `invariants/blend.test.ts`.

- 8-decimal PXJ, `pixeljourney` only, template counts, collection scope, debit, unsent withdraw, unsent `burnasset`, unsent sink transfer, unsent `mintasset` with no new id.
- Chain row required for a deposit. Stale owner, third-party owner, and a lying client template are refused.
- Chain rows required before a mint body. Missing row, unauthorized minter, wrong schema, and a full template do not debit.
- An unburnable ingredient template, or a missing ingredient template row, does not debit.
- Chain asset row required per consumed id at craft time. Null list, wrong owner, wrong collection do not debit.
- Non-owner, missing vault, unknown recipe, non-positive FT, insufficient FT, template mismatch, wrong collection.
- Fake token contract, fake NFT contract, transfer not to the vault, outgoing transfer, batch of 21, mixed symbol.

## Current status

The burn, sink, and mint bodies are not sent. A broadcast, a live AtomicAssets read, and a wasm are not implemented. The C++ sketch is uncompiled and still does not match this rule.
