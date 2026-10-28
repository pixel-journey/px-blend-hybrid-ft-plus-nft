# Security notes — hybrid FT + NFT blend

## Authorization

- Only the user who owns the deposited ingredients may call craft for that vault.
- Only the admin may add or change recipes.
- NFT transfers into the vault must be authorized by the current owner of each asset.

## Inputs

- FT quantity must be positive and of the expected symbol.
- Template ids must exist and match the recipe.
- Asset ids must be owned by the depositor at the moment of deposit and still match at craft time.
- Empty or mismatched ingredient sets are refused.

## Atomicity

The craft action must either fully succeed (ingredients burned or transferred, result minted or transferred, vault cleared) or fully revert. A partial success that burns ingredients without delivering the result is a loss of user funds.

## What the tested rule covers

`npm test` runs `invariants/blend.test.ts`.

- Owner with sufficient ingredients may craft.
- Non-owner is refused.
- Insufficient or non-positive FT is refused.
- Missing vault is refused.

## Current status

The TypeScript rule exists. The C++ sketch is uncompiled and has not been shown to match the test. Asset matching, burn, and mint are not implemented. The sketch is not the implementation.
