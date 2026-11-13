# Worked examples — hybrid FT + NFT craft

PXJ precision **8**: `1.00000000 PXJ` = `100_000_000` units. Token contract must be `pixeljourney`.

## Example A — deposit then craft

1. FT notify credits vault balance (only from `pixeljourney`).
2. NFT notify accepts vault-owned chain rows with matching templates.
3. Craft when: collection may mint, output supply open, ingredients burnable, one row per asset id, FT balance ≥ recipe cost.
4. Unsent action order: **burns → sink transfer → mint**. `tokens_to_back` is `[]`.

## Example B — wrong token contract

Notify from any account other than `pixeljourney` → refused. Balance unchanged.

## Example C — wrong precision

Quantity that is not 8-decimal PXJ shape → refused.

## Example D — NFT without chain row

Client-only owner claim without `source: "chain"` style row → refused (same ownership discipline as simple blend).

## Example E — non-burnable ingredient

Template not burnable → craft refused before any action body.

## Example F — spent PXJ is sink transfer

Spent FT is modeled as transfer to `ft_sink`, **not** a token `retire`/`burn`. Document that for treasury accounting.

## Example G — C++ sketch warning

`contracts/src/px_hybrid_blend.cpp` is uncompiled and may disagree with TypeScript on token account naming. **TypeScript tests are the rule** until aligned in wax-contract-compiler.
