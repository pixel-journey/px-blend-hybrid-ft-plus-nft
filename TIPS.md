# Tips — hybrid FT + NFT craft

## Two notifies, two checks

| Rail | First receiver | Typical lie |
| --- | --- | --- |
| FT | Token contract (`pixeljourney` for PXJ) | Fake token, wrong precision, mixed symbols |
| NFT | `atomicassets` | Stale owner, client template id |

Do not collapse both into one string compare. Branch on which notify fired.

## PXJ

- Precision **8** only. `1.00000000 PXJ` = `100_000_000`.
- Contract account **`pixeljourney`** is project policy.
- Spent FT is a **transfer to the sink**, not `retire`. Say that in treasury docs.

## Order

1. Validate recipe, chain rows, and balances.
2. Build burns, then sink transfer, then mint (all unsent here).
3. Only then mutate the returned vault book.

A book debit with `sent: false` is not an on-chain blend. If you later broadcast and mint fails after burn, you need a recovery design this lab does not include.

## Common mistakes

1. Debiting PXJ and WAX in one recipe (mixed symbol — refused).
2. Burning every NFT of a template when the recipe asked for one. Pick the lowest matching ids for the required count.
3. Treating the vault book as proof of ownership. Each consumed id needs a chain row whose owner is the vault.
4. Depositing an NFT that is still owned by the user (`stale owner`).
5. Using the wallet-tax formula so the sink receives less than `ONE`.

## Nice-to-have extensions (not in this repo)

| Idea | Note |
| --- | --- |
| Wildcard NFT slot plus exact FT | Compose with [wildcard](https://github.com/pixel-journey/px-blend-schema-wildcard-recipes) |
| Tax on the FT leg | Only if the sink still receives the full recipe amount |
| Idempotent memo `craft:id` | [memo router](https://github.com/pixel-journey/px-memo-action-router) |

Related: [simple blend](https://github.com/pixel-journey/px-blend-simple-nft-to-nft) · [token ledger](https://github.com/pixel-journey/px-token-balance-ledger) · [FT vault](https://github.com/pixel-journey/px-stake-ft-single-sided-vault)
