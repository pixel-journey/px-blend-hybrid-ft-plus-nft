# Official sources

| Source | Use |
| --- | --- |
| [atomicassets-contract](https://github.com/pinknetworkx/atomicassets-contract) | `mintasset`, `burnasset`, `transfer`, template burnable flags |
| [WAX: How-To AtomicAssets](https://docs.wax.io/build/tutorials/howto_atomicassets) | Standard overview |
| [WAX: Blend NFTs](https://docs.wax.io/build/tutorials/howto_atomicassets/blend_nft) | Craft pattern |
| [WAX: Minting NFTs](https://docs.wax.io/build/tutorials/howto_atomicassets/mint_nft) | mint parameters |
| [docs.wax.io](https://docs.wax.io/) | Network docs |
| Org | [ATOMICASSETS-V2.md](https://github.com/pixel-journey/wax-ecosystem-blueprint-catalog/blob/main/ATOMICASSETS-V2.md) — no `tokens_to_back`, no holders |

## Product facts locked by this lab

- **PXJ** is precision **8** on contract/issuer `pixeljourney`. `1.00000000 PXJ` = `100_000_000` minor units. `1.0000 PXJ` is refused.
- Craft debits the **book** and returns burns, sink, and mint with `sent: false`. That is not an atomic on-chain blend.
- Action order in the returned list: **burns**, then **sink transfer**, then **mint**.
- FT notify needs **two names**: token contract as first receiver, and `self` for the vault. The template's one-string `shouldHandleNotify` is the wrong helper here.
- Chain asset rows are required at craft time. The vault book alone is not ownership proof.
- `source: "chain"` is a tag the test sets, not a table load.
- Issued supply is **not** incremented. `minted` stays null.

## Domain map

| Repo | Role |
| --- | --- |
| [simple blend](https://github.com/pixel-journey/px-blend-simple-nft-to-nft) | Template-exact NFT ingredients only |
| **This repo** | FT (PXJ) + NFT ingredients, sink transfer, ordered burns/mint |
| [schema wildcard](https://github.com/pixel-journey/px-blend-schema-wildcard-recipes) | Schema wildcards (`-1`) |
| [memo router](https://github.com/pixel-journey/px-memo-action-router) | `blend:recipe` memos |
| [token ledger](https://github.com/pixel-journey/px-token-balance-ledger) | Conservation under a token |
| [contract template](https://github.com/pixel-journey/px-antelope-contract-template) | Do not copy the collapsed notify helper |
