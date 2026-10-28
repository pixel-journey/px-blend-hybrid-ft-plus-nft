export type Vault = {
  user: string;
  ft: number;
  asset_ids: number[];
};

export type Recipe = {
  id: number;
  ft_required: number;
  template_ids: number[];
};

export function canCraft(
  caller: string,
  vault: Vault | null,
  recipe: Recipe | null
): { ok: true } | { ok: false; reason: string } {
  if (!vault) return { ok: false, reason: "no vault" };
  if (caller !== vault.user) return { ok: false, reason: "not the owner" };
  if (!recipe) return { ok: false, reason: "unknown recipe" };
  if (!Number.isInteger(vault.ft) || vault.ft <= 0) return { ok: false, reason: "non-positive FT" };
  if (vault.ft < recipe.ft_required) return { ok: false, reason: "insufficient FT" };
  if (vault.asset_ids.length === 0) return { ok: false, reason: "no NFTs" };
  // Template matching omitted for the minimal rule
  return { ok: true };
}
