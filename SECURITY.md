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

## Current status

No tested TypeScript rule exists yet. The C++ sketch is uncompiled. The sketch is not the implementation.
