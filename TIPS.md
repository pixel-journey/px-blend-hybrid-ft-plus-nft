# Tips — hybrid FT + NFT craft

## Two rails, two hygiene problems

| Rail | First receiver | Typical failure |
| --- | --- | --- |
| FT | Token contract (`pixeljourney` for PXJ) | Fake token, wrong precision, mixed symbols |
| NFT | `atomicassets` | Fake NFT, stale owner, client template lie |

Do not collapse both into one `shouldHandleNotify` string. Hybrid code must branch on which notify fired.

## PXJ product policy

- Precision **8** only (`1.00000000 PXJ` = `100_000_000`).
- Contract string **`pixeljourney`** is intentional project policy, not a generic eosio.token demo.
- Spent FT is modeled as **transfer to sink**, not `retire` — document that for treasury accounting.

## Ordering and atomicity

1. Validate recipe + chain rows + balances.  
2. Build **burns → sink transfer → mint** (all unsent in this lab).  
3. Only then mutate the returned vault book.

A debited book with `sent: false` is **not** an atomic on-chain blend. If you broadcast later and mint fails after burn, you need an explicit recovery design.

## Custody reminders

- Vault book ≠ ownership proof: craft requires a **chain asset row** per consumed id with owner = vault.
- NFT deposit: owner on the row must already be the vault (`stale owner` if still the user).
- Pick lowest matching asset ids for the required count; do not burn every holding of that template.

## Related curriculum

| Lab | When |
| --- | --- |
| [simple NFT blend](https://github.com/pixel-journey/px-blend-simple-nft-to-nft) | No FT rail |
| [schema wildcard](https://github.com/pixel-journey/px-blend-schema-wildcard-recipes) | Non-exact templates |
| [memo router](https://github.com/pixel-journey/px-memo-action-router) | `blend:…` memos |
| [token ledger](https://github.com/pixel-journey/px-token-balance-ledger) | Conservation under a token |
| [FT vault shares](https://github.com/pixel-journey/px-stake-ft-single-sided-vault) | Share math, not craft |
