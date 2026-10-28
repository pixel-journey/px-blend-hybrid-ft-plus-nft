# px-blend-hybrid-ft-plus-nft

Private. Tested TypeScript rule exists. C++ sketch is uncompiled. Does not mint, burn, or craft on chain.

## What is true

`npm test` runs `invariants/blend.test.ts`.

- Owner with sufficient ingredients may craft.
- Non-owner is refused.
- Insufficient or non-positive FT is refused.
- Missing vault is refused.

The C++ in `contracts/src/px_hybrid_blend.cpp` is still an uncompiled sketch. It has not been shown to match the test. `cdt-cpp` was not run. There is no wasm.

## Run

```bash
npm test
```

No host is called.

Do not deploy the sketch.
