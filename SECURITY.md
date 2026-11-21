# Security — hybrid FT + NFT blend

## Closed in tests

| Issue | Behavior |
| --- | --- |
| Non-owner craft / withdraw | refused |
| PXJ not precision **8** / wrong contract | refused |
| Fake token / NFT first receiver | refused |
| Client template ≠ chain row | refused |
| Stale / third-party asset owner | refused |
| Missing chain rows (collection, template, assets) | no debit |
| Unburnable / full template / not a minter | no debit |
| Batch > **20** / duplicate ids / mixed symbol | refused |
| Template counts / wrong collection | refused |

Burns → sink → mint in the returned action list; all **`sent: false`**. `minted` stays null. Issued supply is not incremented.

## Not closed (production)

| Concern | Guidance |
| --- | --- |
| Auth | Real `require_auth` on craft / withdraw |
| Notify | `get_first_receiver`; ignore self-outbound |
| Chain reads | Load AtomicAssets tables inside the action |
| Broadcast | Unsent bodies are not transfers |
| Atomicity | Burn without mint needs recovery |
| Supply race | Re-read template supply in the minting action |
| Wasm | C++ sketch is uncompiled |

## Attack angles

1. Treating 4-decimal PXJ as 8-decimal (`1.0000 PXJ` → 10000× error).  
2. `eosio.token` delivering a PXJ quantity.  
3. Trusting the vault book alone at craft (external burn leaves the book lying).  
4. Debiting the book and calling it broadcast while every action is still unsent.  
5. Counting another collection's template 42 as the ingredient.  
6. Collapsing notify into a single `shouldHandleNotify(tokenOrSelf)` string ([template](https://github.com/pixel-journey/px-antelope-contract-template) is the wrong shape for this vault).

## Honesty limits

No live AtomicAssets read, no broadcast, no PXJ balance on `pixeljourney` (the book is not the token).

| Sibling | Distinction |
| --- | --- |
| [simple blend](https://github.com/pixel-journey/px-blend-simple-nft-to-nft) | NFT-only template multiset |
| [wildcard](https://github.com/pixel-journey/px-blend-schema-wildcard-recipes) | Exact-before-wildcard match |
| [memo router](https://github.com/pixel-journey/px-memo-action-router) | Structured memos |
| [decimal supply](https://github.com/pixel-journey/px-token-ft-decimal-supply-simulator) | Precision bounds |

[atomicassets-contract](https://github.com/pinknetworkx/atomicassets-contract) · [docs.wax.io AtomicAssets](https://docs.wax.io/build/tutorials/howto_atomicassets).
