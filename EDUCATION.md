# Education

Quest 047. The tested rule is the vault book, not a mint.

## PXJ

PXJ has 8 decimal places. One token is `1.00000000 PXJ`, which is 100000000 units. A quantity with four decimal places is a different symbol and is refused. The token contract is `pixeljourney`, not `eosio.token`.

## The pattern

One notification cannot see both an FT transfer and an NFT transfer. The client sends the `pixeljourney` transfer, the AtomicAssets transfer, and `craft` in one transaction. Each notify either credits this vault or returns. `craft` then checks the book.

## What the test enforces

- The recipe is a multiset of template ids. One asset of template 7 does not satisfy a recipe that asks for template 42.
- Extra assets stay. This is not the exact-set rule in `px-blend-simple-nft-to-nft`.
- The FT debit and the asset removal happen in the returned vault together. A mismatch throws first.
- Withdraw formats the leftover with 8 decimals and marks the action unsent. That is the body a later contract would send. This pass does not send it.
- The result does not contain a new asset id. `mintasset` is only the unsent body. `burnasset` is one unsent body per consumed id. The spent PXJ stays a book debit. There is no `pixeljourney` burn.

## What is still uncompiled

The C++ sketch still listens for `eosio.token` and does not match templates. It has not been shown to match `invariants/blend.ts`.
