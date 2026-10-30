# Education

Quest 047. The tested rule is the vault book, not a mint.

## The pattern

One notification cannot see both an FT transfer and an NFT transfer. The client sends the token transfer, the AtomicAssets transfer, and `craft` in one transaction. Each notify either credits this vault or returns. `craft` then checks the book.

## What the test enforces

- The recipe is a multiset of template ids. One asset of template 7 does not satisfy a recipe that asks for template 42. Two asks need two held assets.
- Extra assets stay. This is not the exact-set rule in `px-blend-simple-nft-to-nft`.
- The FT debit and the asset removal happen in the returned vault together. A mismatch throws first, so the input book is unchanged.
- The result does not contain a new asset id. Mint and burn are not this pass.

## What is still uncompiled

The C++ sketch has the notify guards and then an unfinished `craft`. It has not been shown to match `invariants/blend.ts`.
