# Security notes — hybrid FT + NFT blend

## Authorization

- Only the user on the vault may craft it or withdraw from it.
- A notify credits only when `from` is that user. A different `from` is refused.
- NFT ownership on AtomicAssets is not read here. The book trusts the notify arguments. That is not a chain check.

## Inputs

- PXJ must arrive from `pixeljourney` with precision 8. `1.0000 PXJ` is refused. `eosio.token` is the wrong contract for PXJ.
- The first credit sets the symbol and the contract. A later credit in another symbol or contract is refused.
- At most 20 asset ids per notify. Ids must be unique, including ids already in the vault.
- Template counts must cover the recipe. Extra held assets do not have to be part of the recipe.
- Withdraw cannot take more FT than the balance, and cannot take an asset id that is not still in the book.

## Atomicity

`craft` either returns a vault with the FT and the matched assets removed, plus unsent burn and mint bodies, or throws before returning. `minted` stays null. Withdraw and those AtomicAssets bodies set `sent` to false. Nothing in `npm test` broadcasts.

## What the tested rule covers

`npm test` runs `invariants/blend.test.ts`.

- 8-decimal PXJ, `pixeljourney` only, template counts, debit, unsent withdraw, unsent `burnasset`, unsent `mintasset` with no new id.
- Non-owner, missing vault, unknown recipe, non-positive FT, insufficient FT, template mismatch.
- Fake token contract, fake NFT contract, transfer not to the vault, outgoing transfer, batch of 21, mixed symbol.

## Current status

The burn and mint bodies are not sent. A broadcast, and an AtomicAssets ownership read, are not implemented. The C++ sketch is uncompiled and still does not match this rule.
