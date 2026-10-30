# Security notes — hybrid FT + NFT blend

## Authorization

- Only the user on the vault may craft it.
- A notify credits only when `from` is that user. A different `from` is refused.
- NFT ownership on AtomicAssets is not read here. The book trusts the notify arguments. That is not a chain check.

## Inputs

- FT quantity must parse as `amount.precision SYMBOL` and be positive.
- The first credit sets the symbol. A later credit in another symbol is refused.
- At most 20 asset ids per notify. Ids must be unique, including ids already in the vault.
- Template counts must cover the recipe. Extra held assets do not have to be part of the recipe.

## Atomicity

`craft` either returns a vault with the FT and the matched assets removed, or throws before returning. It does not mint. A chain transaction that puts both transfers and `craft` in one transaction still depends on the contract, which is not compiled.

## What the tested rule covers

`npm test` runs `invariants/blend.test.ts`.

- Owner, symbol, and template counts.
- Non-owner, missing vault, unknown recipe, non-positive FT, insufficient FT, template mismatch.
- Fake token contract, fake NFT contract, transfer not to the vault, outgoing transfer, batch of 21, mixed symbol.
- Debit leaves leftovers. A thrown craft leaves the input vault as it was. `minted` is null.

## Current status

The TypeScript rule covers the book. Withdrawal transfers, mint, burn, and an AtomicAssets ownership read are not implemented. The C++ sketch is uncompiled and has not been shown to match the test.
