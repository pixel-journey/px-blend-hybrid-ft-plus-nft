# Hybrid craft: FT deposit + NFT ingredients → mint

> **Domain:** AtomicAssets hybrid blend (FT + NFT)  
> **Sources:** [SOURCES.md](SOURCES.md)  
> **Catalog:** [px-contract-examples-vault](https://github.com/pixel-journey/px-contract-examples-vault)

**Goal:** A two-rail craft desk: **PXJ at 8 decimals** from `pixeljourney` plus NFT ingredients whose template and collection come from **chain rows**, not client claims.

Spent PXJ is an unsent transfer to `ft_sink` (not a token burn). Burn and mint bodies are unsent sketches — no WAX node calls.

**Official:** [atomicassets-contract](https://github.com/pinknetworkx/atomicassets-contract). **WAX:** [How-To AtomicAssets](https://docs.wax.io/build/tutorials/howto_atomicassets). **NFT-only sibling:** [px-blend-simple-nft-to-nft](https://github.com/pixel-journey/px-blend-simple-nft-to-nft).

## Learning materials

| Doc | Role |
| --- | --- |
| [EDUCATION.md](EDUCATION.md) | Full course |
| [WORKED-EXAMPLES.md](WORKED-EXAMPLES.md) | Deposit, craft order, refusals |
| [TIPS.md](TIPS.md) | Two-rail hygiene, PXJ@8 |
| [SECURITY.md](SECURITY.md) | Notify and custody |
| [SOURCES.md](SOURCES.md) | Official + domain map |

## What is true (executed)

| Rule | Result |
| --- | --- |
| `1.00000000 PXJ` | 100000000 units; wrong precision refused |
| FT notify | Only when token contract is `pixeljourney` |
| NFT notify | Chain rows, vault owner, matching template |
| Craft gates | Collection auth, open supply, burnable ingredients |
| Action order | burns → sink transfer → mint; `tokens_to_back` is `[]` |

## C++ sketch scope

`contracts/src/px_hybrid_blend.cpp` is uncompiled and may disagree with TypeScript on the token account. Prefer tested TypeScript until aligned in [wax-contract-compiler](https://github.com/pixel-journey/wax-contract-compiler).

```bash
npm test
```

MIT — Pixel Journey
