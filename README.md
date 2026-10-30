# px-blend-hybrid-ft-plus-nft

Private. The tested rule matches templates and debits only on success. It does not mint. The C++ sketch is uncompiled and does not do that debit.

## What is true

`npm test` runs `invariants/blend.test.ts`.

- Owner, symbol `4,PXJ`, and enough of each required template may craft.
- Non-owner, missing vault, unknown recipe, non-positive FT, insufficient FT, and a template mismatch are refused.
- Craft spends `ft_required` and the lowest asset id of each required template. Extra FT and other assets stay. `minted` is null.
- A refused craft throws and does not change the input vault.
- `eosio.token` is the only FT notify that credits. `atomicassets` is the only NFT notify that credits. `from == self` or `to != self` credits nothing.
- A batch of 21 asset ids is refused. A second symbol on the same vault is refused.
- `100.0000 PXJ` credits 1000000 units. That symbol is the example. It is not a reading of a live token.

`contracts/src/px_hybrid_blend.cpp` still stops before the template match. `cdt-cpp` was not run. There is no wasm.

`client/wharfkit-demo.ts` is not part of `npm test`. Calling it would broadcast.

## Run

```bash
npm test
```

No host is called.

Do not deploy the sketch.
