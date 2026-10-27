import { Session } from "@wharfkit/session";

const CONTRACT = "replaceaccount";

/**
 * Order matters. craft reads the deposit rows written by the two notifies
 * earlier in the same transaction.
 */
export async function craftHybrid(
  session: Session,
  recipeId: string,
  waxQuantity: string,
  assetIds: string[],
) {
  return session.transact({
    actions: [
      {
        account: "eosio.token",
        name: "transfer",
        authorization: [session.permissionLevel],
        data: {
          from: session.actor,
          to: CONTRACT,
          quantity: waxQuantity,
          memo: `blend:${recipeId}`,
        },
      },
      {
        account: "atomicassets",
        name: "transfer",
        authorization: [session.permissionLevel],
        data: {
          from: session.actor,
          to: CONTRACT,
          asset_ids: assetIds,
          memo: `blend:${recipeId}`,
        },
      },
      {
        account: CONTRACT,
        name: "craft",
        authorization: [session.permissionLevel],
        data: { user: session.actor, recipe_id: recipeId },
      },
    ],
  });
}
