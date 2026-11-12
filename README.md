# px-blend-hybrid-ft-plus-nft

> **Domain:** AtomicAssets hybrid craft (FT + NFT)  
> **Sources:** [SOURCES.md](SOURCES.md)  
> **Vault:** [px-contract-examples-vault](https://github.com/pixel-journey/px-contract-examples-vault)

Private. The tested rule uses **PXJ at 8 decimals** from `pixeljourney`. An NFT credit stores the template and collection from a **chain row**, not from the client. Craft debits only when chain rows say this contract may mint the output template, each ingredient template is burnable, and each consumed asset still has a chain row owned by the vault. Spent PXJ is an unsent transfer to `ft_sink`, not a burn. Burn and mint bodies are unsent. It does not mint.

Official AtomicAssets: [contract](https://github.com/pinknetworkx/atomicassets-contract). WAX: [How-To](https://docs.wax.io/build/tutorials/howto_atomicassets). NFT-only sibling: [px-blend-simple-nft-to-nft](https://github.com/pixel-journey/px-blend-simple-nft-to-nft).

## What is true

`npm test` runs `invariants/blend.test.ts`. The tests do not call a WAX node. A chain row is an argument.

- `1.00000000 PXJ` is 100000000 units. Wrong precision is refused.
- PXJ notify only when the token contract is `pixeljourney`.
- NFT notify only with `source: "chain"` rows, vault as owner, matching template.
- Craft needs collection auth, open template supply, burnable ingredient templates, and one chain asset row per consumed id.
- Actions ordered: burns → sink transfer → mint. `tokens_to_back` is always `[]` (v2).

`contracts/src/px_hybrid_blend.cpp` is an uncompiled sketch and still disagrees with the TypeScript rule on `eosio.token`. Do not treat it as the integration.

## Run

```bash
npm test
```

See [SOURCES.md](SOURCES.md) and [ATOMICASSETS-V2.md](https://github.com/pixel-journey/wax-ecosystem-blueprint-catalog/blob/main/ATOMICASSETS-V2.md).
