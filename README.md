# px-blend-hybrid-ft-plus-nft

Quest 047. Private. Uncompiled sketch. There is no `npm test`. `cdt-cpp` was not run. This does not mint, burn, or craft.

## What the file tries to say

A hybrid recipe is three actions in one transaction, because one notification cannot see both an FT transfer and an NFT transfer. `contracts/src/px_hybrid_blend.cpp` sketches:

- `eosio.token::transfer` and `atomicassets::transfer`, each checked with `get_first_receiver()`, memo prefix `blend:`, NFT batch capped at 20.
- Deposits stored as `extended_asset` plus asset ids. The user pays the first row.
- `craft` checks recipe id, FT amount, FT contract, and symbol, then stops. Matching asset ids, burn, and mint are not written. `(void)recipe` is a marker.

`template_id == -1` as a schema wildcard is not implemented. Only the native WAX notify is wired. There is no `withdraw`. `client/wharfkit-demo.ts` was not run.

Do not deploy this file.
