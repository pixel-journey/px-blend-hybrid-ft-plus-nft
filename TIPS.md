# Tips — hybrid blends

## Two rails

- Treat **FT notify** and **NFT notify** as separate hygiene problems (token first_receiver vs AtomicAssets transfer).
- Debit FT only when mint is known-good; avoid “take payment then fail mint.”

## PXJ policy

- Precision **8** is a Pixel Journey product invariant in this lab.
- Issuer/contract string `pixeljourney` is intentional — not a generic eosio.token demo.

## Action ordering

Burns (or locks) before mint reduces double-spend windows. Sink transfer records FT spend for accounting.

## Related

| Lab | When |
| --- | --- |
| [simple NFT blend](https://github.com/pixel-journey/px-blend-simple-nft-to-nft) | No FT rail |
| [schema wildcard](https://github.com/pixel-journey/px-blend-schema-wildcard-recipes) | Non-exact templates |
| [memo router](https://github.com/pixel-journey/px-memo-action-router) | `blend:…` memos |
| [token ledger](https://github.com/pixel-journey/px-token-balance-ledger) | PXJ balance book |
