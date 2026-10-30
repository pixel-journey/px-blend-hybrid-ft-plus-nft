export type Asset = { id: bigint; template_id: number };

export type Vault = {
  user: string;
  ft: bigint;
  ft_symbol: string;
  assets: Asset[];
};

export type Recipe = {
  id: number;
  ft_required: bigint;
  ft_symbol: string;
  template_ids: number[];
};

export type Gate =
  | { ok: true }
  | { ok: false; reason: string };

const NAME = /^[a-z1-5.]{1,12}$/;
const INT64_MAX = 9223372036854775807n;
const UINT64_MAX = 18446744073709551615n;

export function assertName(name: string): string {
  if (!NAME.test(name) || name.startsWith(".") || name.endsWith(".")) {
    throw new Error("bad name");
  }
  return name;
}

function countTemplates(ids: readonly number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const id of ids) {
    if (!Number.isInteger(id) || id < 1) throw new Error("bad template id");
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function canCraft(caller: string, vault: Vault | null, recipe: Recipe | null): Gate {
  if (!vault) return { ok: false, reason: "no vault" };
  if (caller !== vault.user) return { ok: false, reason: "not the owner" };
  if (!recipe) return { ok: false, reason: "unknown recipe" };
  if (recipe.ft_required < 1n) return { ok: false, reason: "bad recipe" };
  if (recipe.template_ids.length === 0) return { ok: false, reason: "empty recipe" };
  if (vault.ft < 1n) return { ok: false, reason: "non-positive FT" };
  if (vault.ft_symbol !== recipe.ft_symbol) return { ok: false, reason: "wrong symbol" };
  if (vault.ft < recipe.ft_required) return { ok: false, reason: "insufficient FT" };
  if (vault.assets.length === 0) return { ok: false, reason: "no NFTs" };

  const seen = new Set<string>();
  for (const asset of vault.assets) {
    if (asset.id < 1n || asset.id > UINT64_MAX) return { ok: false, reason: "bad asset id" };
    const key = asset.id.toString();
    if (seen.has(key)) return { ok: false, reason: "duplicate asset" };
    seen.add(key);
  }

  let need: Map<number, number>;
  try {
    need = countTemplates(recipe.template_ids);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "bad template id" };
  }
  const have = new Map<number, number>();
  for (const asset of vault.assets) {
    if (!Number.isInteger(asset.template_id) || asset.template_id < 1) {
      return { ok: false, reason: "bad template id" };
    }
    have.set(asset.template_id, (have.get(asset.template_id) ?? 0) + 1);
  }
  for (const [template, count] of need) {
    if ((have.get(template) ?? 0) < count) return { ok: false, reason: "template mismatch" };
  }
  return { ok: true };
}

export type CraftResult = {
  vault: Vault;
  consumedIds: bigint[];
  ftSpent: bigint;
  minted: null;
};

/** Debit the recipe. Extra FT and unmatched NFTs stay. Nothing is minted. */
export function craft(caller: string, vault: Vault | null, recipe: Recipe | null): CraftResult {
  const gate = canCraft(caller, vault, recipe);
  if (!gate.ok) throw new Error(gate.reason);
  if (!vault || !recipe) throw new Error("no vault");
  const need = countTemplates(recipe.template_ids);
  const consumed = new Set<string>();
  for (const [template, count] of need) {
    const matches = vault.assets
      .filter((asset) => asset.template_id === template)
      .map((asset) => asset.id)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const id of matches.slice(0, count)) consumed.add(id.toString());
  }
  return {
    vault: {
      user: vault.user,
      ft: vault.ft - recipe.ft_required,
      ft_symbol: vault.ft_symbol,
      assets: vault.assets.filter((asset) => !consumed.has(asset.id.toString())),
    },
    consumedIds: [...consumed].map((id) => BigInt(id)).sort((a, b) => (a < b ? -1 : 1)),
    ftSpent: recipe.ft_required,
    minted: null,
  };
}

export function parseQuantity(quantity: string): { amount: bigint; symbol: string } {
  const match = /^([0-9]+)\.([0-9]{1,18}) ([A-Z]{1,7})$/.exec(quantity);
  if (!match) throw new Error("bad quantity");
  const amount = BigInt(match[1] + match[2]);
  if (amount > INT64_MAX) throw new Error("ft cap");
  return { amount, symbol: `${match[2].length},${match[3]}` };
}

export type FtNotify = {
  firstReceiver: string;
  from: string;
  to: string;
  self: string;
  quantity: string;
  memo: string;
};

export function applyFtNotify(vault: Vault | null, note: FtNotify): { vault: Vault | null; credited: bigint } {
  assertName(note.from);
  assertName(note.to);
  assertName(note.self);
  if (note.firstReceiver !== "eosio.token") throw new Error("fake token");
  if (note.from === note.self || note.to !== note.self) return { vault, credited: 0n };
  if (!note.memo.startsWith("blend:")) throw new Error("memo must start with blend:");
  const parsed = parseQuantity(note.quantity);
  if (parsed.amount < 1n) throw new Error("non-positive FT");
  if (!vault) {
    return {
      vault: { user: note.from, ft: parsed.amount, ft_symbol: parsed.symbol, assets: [] },
      credited: parsed.amount,
    };
  }
  if (vault.user !== note.from) throw new Error("not the owner");
  if (vault.ft_symbol !== parsed.symbol) throw new Error("mixed symbols");
  if (vault.ft > INT64_MAX - parsed.amount) throw new Error("ft cap");
  return {
    vault: { ...vault, assets: vault.assets.slice(), ft: vault.ft + parsed.amount },
    credited: parsed.amount,
  };
}

export type NftNotify = {
  firstReceiver: string;
  from: string;
  to: string;
  self: string;
  assetIds: bigint[];
  templateIds: number[];
  memo: string;
};

export function applyNftNotify(vault: Vault | null, note: NftNotify): { vault: Vault | null; credited: bigint[] } {
  assertName(note.from);
  assertName(note.to);
  assertName(note.self);
  if (note.firstReceiver !== "atomicassets") throw new Error("fake nft");
  if (note.from === note.self || note.to !== note.self) return { vault, credited: [] };
  if (!note.memo.startsWith("blend:")) throw new Error("memo must start with blend:");
  if (note.assetIds.length === 0 || note.assetIds.length > 20) throw new Error("bad asset batch");
  if (note.templateIds.length !== note.assetIds.length) throw new Error("bad asset batch");
  const incoming: Asset[] = [];
  const seen = new Set<string>((vault?.assets ?? []).map((asset) => asset.id.toString()));
  for (let i = 0; i < note.assetIds.length; i++) {
    const id = note.assetIds[i];
    const template = note.templateIds[i];
    if (id < 1n || id > UINT64_MAX) throw new Error("bad asset id");
    if (!Number.isInteger(template) || template < 1) throw new Error("bad template id");
    const key = id.toString();
    if (seen.has(key)) throw new Error("duplicate asset");
    seen.add(key);
    incoming.push({ id, template_id: template });
  }
  if (!vault) {
    return {
      vault: { user: note.from, ft: 0n, ft_symbol: "", assets: incoming },
      credited: incoming.map((asset) => asset.id),
    };
  }
  if (vault.user !== note.from) throw new Error("not the owner");
  return {
    vault: { ...vault, assets: vault.assets.concat(incoming) },
    credited: incoming.map((asset) => asset.id),
  };
}
