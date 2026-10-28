# Education

Quest 047. Seeded. No tested rule yet.

## The intended pattern

FT and NFT ingredients are deposited into a vault. A later craft action verifies the vault against a recipe, burns or transfers the ingredients, and mints or transfers the result. The craft is all-or-nothing.

## Why two steps

A single action that both pulls complex ingredient sets and crafts is harder to reason about under partial failure. The deposit-then-craft split makes the verification step explicit.

## Current state

There is an uncompiled C++ sketch. There is no `npm test` rule. There is no wasm.

The sketch is not the implementation.
