# px-blend-hybrid-ft-plus-nft

Quest 047. Tier B. A hybrid recipe cannot be one notification: FT and NFT transfers are different actions. The client sends them in one transaction, then `craft`.

## What compiles

- `on_notify(eosio.token::transfer)` with `get_first_receiver()` and a `blend:` memo.
- `on_notify(atomicassets::transfer)` with the same checks and a batch cap of 20.
- Deposits are `extended_asset` plus a vector of asset ids. The user pays the first row.
- `craft` checks recipe id, FT amount, FT contract, and symbol, then stops.

## What does not

`craft` does not yet match `asset_ids` to `atomicassets` rows, does not burn or keep inputs, and does not mint. The `(void)recipe` line is a marker, not a success path. Do not deploy this as a live blender.

`template_id == -1` is the documented wildcard for a later matcher: any template in the schema counts. It is not implemented.

Custom FT contracts are not notified yet. This slice accepts native WAX only. A recipe whose `ft_cost.contract` is not `eosio.token` cannot be filled.

If `craft` fails, the whole transaction reverts, including the transfers. That is why the three actions share one transaction. A deposit left behind by a successful transfer in an earlier transaction is a different path. Add a `withdraw` before mainnet.

## Vectors

PX-VEC-01 fake notifies. This file does not consume randomness.

Private while the vector suite is open.
