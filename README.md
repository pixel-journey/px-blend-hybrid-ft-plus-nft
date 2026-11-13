# Hybrid craft: FT deposit + NFT ingredients → mint

> **Domain:** AtomicAssets hybrid blend (FT + NFT)  
> **Sources:** [SOURCES.md](SOURCES.md)  
> **Catalog:** [px-contract-examples-vault](https://github.com/pixel-journey/px-contract-examples-vault)

**Goal:** Teach a two-rail craft desk: **PXJ at 8 decimals** from `pixeljourney` plus NFT ingredients whose template and collection come from **chain rows**, not client claims. Craft debits only when the contract may mint the output template, each ingredient template is burnable, and each consumed asset still has a vault-owned chain row.

Spent PXJ is modeled as an unsent transfer to `ft_sink` (not a token burn). Burn and mint bodies are unsent action sketches — this lab does not call a WAX node.

**Official AtomicAssets:** [contract](https://github.com/pinknetworkx/atomicassets-contract). **WAX:** [How-To AtomicAssets](https://docs.wax.io/build/tutorials/howto_atomicassets). **NFT-only sibling:** [px-blend-simple-nft-to-nft](https://github.com/pixel-journey/px-blend-simple-nft-to-nft).

## What is true (executed)

`npm test` runs `invariants/blend.test.ts`. Chain rows are test arguments.

| Rule | Result |
| --- | --- |
| `1.00000000 PXJ` | 100000000 units; wrong precision refused |
| FT notify | Only when token contract is `pixeljourney` |
| NFT notify | Requires `source: "chain"` rows, vault owner, matching template |
| Craft gates | Collection auth, open template supply, burnable ingredients, one chain row per id |
| Action order | burns → sink transfer → mint; `tokens_to_back` is always `[]` (v2) |

## C++ sketch scope

`contracts/src/px_hybrid_blend.cpp` is an uncompiled sketch and still disagrees with the TypeScript rule on `eosio.token`. Prefer the tested TypeScript as the rule of this repository until a production compile path is aligned in [wax-contract-compiler](https://github.com/pixel-journey/wax-contract-compiler).

## Run

```bash
npm test
```

See [SOURCES.md](SOURCES.md) and [ATOMICASSETS-V2.md](https://github.com/pixel-journey/wax-ecosystem-blueprint-catalog/blob/main/ATOMICASSETS-V2.md).

MIT — Pixel Journey
