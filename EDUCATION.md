# Education — FT plus NFT, still unsent

> **Rung:** `npm test` passes. `craft` debits a **book** and returns `burnasset` / `mintasset` objects with `sent: false`. Nothing is broadcast. `contracts/src/px_hybrid_blend.cpp` is an uncompiled sketch. Issued supply is not incremented. PXJ is not burned.  
> **The test is the rule.**

Do `px-blend-simple-nft-to-nft` first if you only need template counts. This lab adds a fungible leg, a token notify, a chain-row read, and a withdraw that is also unsent.

## What you should be able to do

| Level | After this file |
| --- | --- |
| Beginner | Turn `1.00000000 PXJ` into `100000000n` minor units and refuse `1.0000 PXJ` |
| Intermediate | Walk a craft that spends one PXJ, burns the lowest matching asset id, and leaves the extra NFT |
| Masterclass | Say why `sent: false` plus a debited vault is not an atomic blend, and why `source: "chain"` is still a tag |

---

## Beginner — one scene

PXJ in this lab is the symbol `8,PXJ` from the account `pixeljourney`. One whole token is `100000000n` (`ONE`).

Alice's vault holds `ONE` and asset `1001` of template `42` in collection `examplecol`. The recipe wants that much PXJ and one template `42`. Output template is `7`, schema `examplesch`.

`canCraft("alice", vault, recipe)` is ok. Bob is `not the owner`. Half a PXJ is `insufficient FT`. Zero is `non-positive FT`. A null vault is `no vault`. A null recipe is `unknown recipe`.

`applyFtNotify` of quantity `1.00000000 PXJ`, first receiver `pixeljourney`, memo `blend:1`, to `pxblend`, credits `ONE` and records symbol `8,PXJ` and contract `pixeljourney`.

`1.0000 PXJ` throws `pxj precision`. So does a vault symbol `4,PXJ`. A first receiver of `eosio.token` on a PXJ quantity throws `fake token`.

### Words

| Word | Meaning here |
| --- | --- |
| `8,PXJ` | Precision 8, code PXJ. The human string is `1.00000000 PXJ` |
| Vault | A book: user, ft amount, symbol, token contract, asset list |
| Chain row | An object with `source: "chain"`. The test builds it. No node is called |
| `sent: false` | The action object exists and was not delivered |
| `minted: null` | No new asset id was assigned |

### Predict, then run

```bash
npm test
```

1. Template `7` held against a recipe that wants `42` is `template mismatch`.
2. Template `42` in collection `othercol` is `wrong collection`, not a template mismatch.
3. A recipe that lists `[42, 42]` fails on one asset and passes on two.

---

## Intermediate — what craft consumes

`craft` calls `canCraft`, then checks the output collection and template rows, then the ingredient template rows, then picks asset ids.

On a vault with FT `ONE + ONE/2` and assets `1002` (template 42), `1001` (template 42), `9` (template 7):

| Field | Asserted |
| --- | --- |
| `consumedIds` | `[1001n]` only. Matches are sorted, then the first `count` are taken |
| `ftSpent` | `ONE` |
| `vault.ft` | `ONE / 2` |
| leftover asset ids | `1002`, then `9` |
| burn | one `burnasset`, `asset_owner` `pxblend`, `asset_id` `"1001"`, `sent` false |
| mint | `mintasset`, template 7, schema `examplesch`, `new_asset_owner` `alice`, `sent` false, no `asset_id` field |
| `minted` | `null` |
| caller's original `held.ft` | unchanged. The function returns a new vault |

A refused craft (`template_ids: [9]`) throws `template mismatch` and the original `vault.ft` stays `ONE`.

Two required copies of 42 become two burns, ids `1001` and `1002`, both unsent. No burn's account is `pixeljourney`. The fungible debit is only `vault.ft`. PXJ is not an AtomicAssets burn.

### Notifies

FT: first receiver must equal the token contract. `from === self` or `to !== self` credits 0 and returns the same vault. Memo must start with `blend:`. A second symbol on an existing PXJ vault throws `mixed symbols`.

NFT: first receiver must be `atomicassets` or the error is `fake nft`. More than 20 ids is `bad asset batch`, and that check happens **before** the chain-row check. The 21-id test passes `chain: null` and still gets the batch error.

A deposit with `chain: null` or `[]` throws `not chain sourced`. A client template `42` against a chain row of template `7` throws `template mismatch`. The credited template and collection come from the row, not from wishful action data.

Owner after transfer: the row's owner must already be `to` (`pxblend`). Owner still `alice` throws `stale owner`. Owner `bob` throws `not the owner`.

### Minter and template cap

No collection row, or `source` missing, throws `not chain sourced` and does not debit. Self `pxblend` with author `someoneelse` and an empty allow-list throws `not a minter` and does not debit. The same call with author `pxblend` is allowed even when the allow-list is empty. The mint's `authorized_minter` is `pxblend`.

`max_supply` 10 and `issued_supply` 10 throws `template full`. The issued number stays 10. The vault FT stays `ONE`. `max_supply` 0 means no cap: issued 100 still crafts, and issued stays 100. This lab does not increment supply.

Wrong schema throws `wrong schema` and does not debit. `burnable: false` throws `not burnable` and does not debit. Ingredient rows must cover each distinct required template id. One row for a two-template recipe throws `not chain sourced`.

### Withdraw

`withdrawFt` of the leftover half formats `0.50000000 PXJ` from `pxblend` to `alice` on account `pixeljourney`, `sent: false`. The returned vault FT is 0. The vault you passed still shows the half. Bob cannot withdraw. Withdrawing a full PXJ from a half throws `insufficient FT`.

`withdrawNfts` of the consumed id throws `missing asset`. The leftover id `9` returns an AtomicAssets `transfer`, `sent: false`.

### Attack → test

| Attack | Naive code | This lab | Test |
| --- | --- | --- | --- |
| Treat 4-decimal PXJ as 8-decimal | 10000x value error | `pxj precision` | `four-decimal PXJ is refused` |
| `eosio.token` notifies a PXJ quantity | Fake deposit | `fake token` | `eosio.token cannot deliver PXJ` |
| Count another collection's template 42 | Wrong NFT burned | `wrong collection` | `the same template id in another collection` |
| Burn every held asset of that template | Extra NFT destroyed | lowest ids, only `count` of them | `craft debits one PXJ and leaves the extra asset` |
| Trust the depositor's template id | Client spoof | chain row wins | `a client template that disagrees…` |
| Read owner from before the transfer | You credit an asset you do not hold | `stale owner` | `a pre-transfer owner is refused` |
| Mint without being a minter | Unauthorized mintasset | `not a minter`, no debit | `a contract that is not the author…` |
| Mint a full template | Issued supply exceeded | `template full`, issued stays | `a full template does not debit…` |

---

## Masterclass — a debited book is not an atomic transaction

`craft` subtracts FT and removes asset ids in the returned object, and sets `sent: false` on both the burns and the mint. If you later send those actions in a second transaction, the book and the chain can diverge: the vault already forgot the NFT, and AtomicAssets still has it, or the burn lands and the mint reverts. The simple blend course said the same thing about an intent. Here the bookkeeping looks more finished, which makes the gap easier to miss.

`source: "chain"` is a field the test sets. A caller who stamps that tag on a homemade row passes `assertMintRead`. Production must load `atomicassets` tables inside the action. The tag is the reminder, not the load.

`applyFtNotify` does not check `get_first_receiver` beyond the string you passed as `firstReceiver`. A contract must read that from the notification context. The hybrid split (token contract versus `self`) is the one to copy. The template's `shouldHandleNotify` uses one string for both. Do not paste that into this vault.

Still absent: a broadcast, a PXJ balance on `pixeljourney` (the book is not the token), an increment of `issued_supply`, RAM payer policy, and a CDT wasm. Do not deploy the sketch.

### Exercise

1. How many minor units is `1.00000000 PXJ`? (`100000000n`. Tested.)
2. Why does the craft with assets 1002, 1001, and 9 consume 1001 rather than 1002? (Matches are sorted, then sliced to the required count. Tested.)
3. Does a successful craft increase `issued_supply`? (No. The open-template test leaves it at 100. `minted` stays null.)

---

## What this course will not teach

- A live blend transaction
- That PXJ left the `pixeljourney` contract
- That `sent: false` will be flipped by `npm test` (it will not)
