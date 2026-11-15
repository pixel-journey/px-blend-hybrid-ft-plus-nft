# Worked examples — hybrid FT + NFT craft

`ONE = 100_000_000` (1.00000000 PXJ at precision **8**). Token contract **pixeljourney**. Sink under test `craft.pxj`. Ingredient template **42**, output template **7**.

## FT notify

| Case | Result |
| --- | --- |
| memo `blend:1`, 1.00000000 PXJ from alice → pxblend | credits vault |
| memo `deposit` | refused |
| second symbol (eosio.token WAX) on PXJ vault | mixed symbols |
| from pxblend → alice (outgoing) | credited **0** |
| self → self | credited **0** |
| 0.00000000 PXJ | non-positive FT |

## Sink on craft

Vault holds `ONE + ONE/2`. Craft spends **ONE**:

- `ftSpent` = ONE, vault remaining + spent = prior balance
- `ftSink.sent` = **false**
- transfer from `pxblend` → `craft.pxj`, quantity `1.00000000 PXJ`, memo `craft:1`

Sink = vault self (`pxblend`) or user (`alice`) → refused; vault.ft unchanged.

Bad sink name `.bad` → `bad name` via canCraft.

## Recipe / craft refusals

Empty `template_ids` → empty recipe; craft does **not** debit. Non-burnable ingredient, wrong contract, client-only NFT rows — refused before action bodies.

Unsent action order remains **burns → sink transfer → mint**. `tokens_to_back` is `[]`.

C++ under `contracts/` is uncompiled; **TypeScript tests are the rule**.
