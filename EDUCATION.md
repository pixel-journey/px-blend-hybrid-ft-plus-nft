# Education

Quest 047. The tested rule is the vault book, not a mint, and not a node call.

## PXJ

PXJ has 8 decimal places. One token is `1.00000000 PXJ`, which is 100000000 units. A quantity with four decimal places is a different symbol and is refused. The token contract is `pixeljourney`, not `eosio.token`.

## The pattern

One notification cannot see both an FT transfer and an NFT transfer. The client sends the `pixeljourney` transfer, the AtomicAssets transfer, and `craft` in one transaction. Each notify either credits this vault or returns. `craft` then checks the book.

AtomicAssets changes `owner` to the recipient before it notifies that recipient. A row whose owner is still the sender was read too early. A contract that skips the table and trusts the memo, or a side array of template ids, will craft the wrong ingredient.

## What the test enforces

- The recipe is a multiset of template ids inside one collection. Template 42 in another collection does not count. One asset of template 7 does not satisfy a recipe that asks for template 42.
- The NFT credit stores `template_id` and `collection_name` from a chain row. No row, a row that is not marked `chain`, a stale owner, or a client template that disagrees is refused. The test passes the row in. It does not fetch one.
- Extra assets stay. This is not the exact-set rule in `px-blend-simple-nft-to-nft`.
- The FT debit and the asset removal happen in the returned vault together. A mismatch throws first.
- Withdraw formats the leftover with 8 decimals and marks the action unsent. That is the body a later contract would send. This pass does not send it.
- The result does not contain a new asset id. `mintasset` is only the unsent body. `burnasset` is one unsent body per consumed id. The spent PXJ stays a book debit. There is no `pixeljourney` burn.

## What is still uncompiled

The C++ sketch still listens for `eosio.token` and does not read `atomicassets::assets`. It has not been shown to match `invariants/blend.ts`.
