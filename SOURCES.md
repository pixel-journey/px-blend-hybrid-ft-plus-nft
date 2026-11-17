# Official sources

| Source | Use |
| --- | --- |
| [atomicassets-contract](https://github.com/pinknetworkx/atomicassets-contract) | `mintasset`, `burnasset`, `transfer`, template burnable flags |
| [WAX: How-To AtomicAssets](https://docs.wax.io/build/tutorials/howto_atomicassets) | Standard overview |
| [WAX: Blend NFTs](https://docs.wax.io/build/tutorials/howto_atomicassets/blend_nft) | Craft pattern |
| [WAX: Minting NFTs](https://docs.wax.io/build/tutorials/howto_atomicassets/mint_nft) | mint parameters |
| [docs.wax.io](https://docs.wax.io/) | Network docs |
| Org | [ATOMICASSETS-V2.md](https://github.com/pixel-journey/wax-ecosystem-blueprint-catalog/blob/main/ATOMICASSETS-V2.md) — no `tokens_to_back`, no holders |

**PXJ** in this lab is locked to **precision 8** and issuer/contract `pixeljourney` (project token policy). That is not a generic eosio.token rule. `1.00000000 PXJ` = `100_000_000` minor units.

## Domain map

| Repo | Role |
| --- | --- |
| [px-blend-simple-nft-to-nft](https://github.com/pixel-journey/px-blend-simple-nft-to-nft) | Template-exact NFT ingredients only |
| **This repo** | FT (PXJ) + NFT ingredients, sink transfer, ordered burns/mint |
| [px-blend-schema-wildcard-recipes](https://github.com/pixel-journey/px-blend-schema-wildcard-recipes) | Schema wildcards (`-1`) |
| [px-memo-action-router](https://github.com/pixel-journey/px-memo-action-router) | `blend:recipe` memos |
| [px-token-balance-ledger](https://github.com/pixel-journey/px-token-balance-ledger) | Conservation under a token |
| [px-invariant-kit](https://github.com/pixel-journey/px-invariant-kit) | Quantity / name gates |
