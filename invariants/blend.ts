export type Asset = { id: bigint; template_id: number; collection_name: string };

export type Vault = {
  user: string;
  ft: bigint;
  ft_symbol: string;
  ft_contract: string;
  assets: Asset[];
};

export type Recipe = {
  id: number;
  ft_required: bigint;
  ft_symbol: string;
  ft_contract: string;
  template_ids: number[];
  ingredient_collection: string;
  output_collection: string;
  output_schema: string;
  output_template_id: number;
};

export type Gate = { ok: true } | { ok: false; reason: string };

export type UnsignedTransfer = {
  account: string;
  name: "transfer";
  authorization: { actor: string; permission: "active" }[];
  data: {
    from: string;
    to: string;
    quantity?: string;
    asset_ids?: string[];
    memo: string;
  };
  sent: false;
};

export type UnsignedBurn = {
  account: "atomicassets";
  name: "burnasset";
  authorization: { actor: string; permission: "active" }[];
  data: { asset_owner: string; asset_id: string };
  sent: false;
};

export type UnsignedMint = {
  account: "atomicassets";
  name: "mintasset";
  authorization: { actor: string; permission: "active" }[];
  data: {
    authorized_minter: string;
    collection_name: string;
    schema_name: string;
    template_id: number;
    new_asset_owner: string;
    immutable_data: [];
    mutable_data: [];
    tokens_to_back: [];
  };
  sent: false;
};

/**
 * A row the contract would have read from atomicassets::assets.
 * source is checked at runtime. Omitting the read is not a row.
 * After atomicassets::transfer, owner is already the recipient.
 */
export type ChainAsset = {
  source: "chain";
  id: bigint;
  owner: string;
  collection_name: string;
  template_id: number;
};

/** A row the contract would have read from atomicassets::collections. Not a node call. */
export type ChainCollection = {
  source: "chain";
  collection_name: string;
  author: string;
  authorized_accounts: string[];
};

/** A row the contract would have read from the collection's templates table. max_supply 0 means no cap. */
export type ChainTemplate = {
  source: "chain";
  collection_name: string;
  schema_name: string;
  template_id: number;
  burnable: boolean;
  max_supply: number;
  issued_supply: number;
};

/** PXJ is issued by pixeljourney. get_currency_stats on 2026-10-30: max_supply 10000000000.00000000 PXJ. */
export const PXJ_CONTRACT = "pixeljourney";
export const PXJ_SYMBOL = "8,PXJ";
export const PXJ_PRECISION = 8;

const NAME = /^[a-z1-5.]{1,12}$/;
const INT64_MAX = 9223372036854775807n;
const UINT64_MAX = 18446744073709551615n;

export function assertName(name: string): string {
  if (!NAME.test(name) || name.startsWith(".") || name.endsWith(".")) throw new Error("bad name");
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

function assertSymbol(symbol: string): { precision: number; code: string } {
  const match = /^([0-9]{1,2}),([A-Z]{1,7})$/.exec(symbol);
  if (!match) throw new Error("bad quantity");
  const precision = Number(match[1]);
  if (precision > 18) throw new Error("bad quantity");
  if (match[2] === "PXJ" && precision !== PXJ_PRECISION) throw new Error("pxj precision");
  return { precision, code: match[2] };
}

export function canCraft(caller: string, vault: Vault | null, recipe: Recipe | null): Gate {
  if (!vault) return { ok: false, reason: "no vault" };
  if (caller !== vault.user) return { ok: false, reason: "not the owner" };
  if (!recipe) return { ok: false, reason: "unknown recipe" };
  try {
    assertSymbol(recipe.ft_symbol);
    assertName(recipe.ingredient_collection);
    assertName(recipe.output_collection);
    assertName(recipe.output_schema);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "bad name" };
  }
  if (recipe.ft_required < 1n) return { ok: false, reason: "bad recipe" };
  if (recipe.template_ids.length === 0) return { ok: false, reason: "empty recipe" };
  if (!Number.isInteger(recipe.output_template_id) || recipe.output_template_id < 1) {
    return { ok: false, reason: "bad recipe" };
  }
  if (vault.ft < 1n) return { ok: false, reason: "non-positive FT" };
  if (vault.ft_symbol !== recipe.ft_symbol) return { ok: false, reason: "wrong symbol" };
  if (vault.ft_contract !== recipe.ft_contract) return { ok: false, reason: "wrong FT contract" };
  if (vault.ft < recipe.ft_required) return { ok: false, reason: "insufficient FT" };
  if (vault.assets.length === 0) return { ok: false, reason: "no NFTs" };

  const seen = new Set<string>();
  for (const asset of vault.assets) {
    if (asset.id < 1n || asset.id > UINT64_MAX) return { ok: false, reason: "bad asset id" };
    const key = asset.id.toString();
    if (seen.has(key)) return { ok: false, reason: "duplicate asset" };
    seen.add(key);
    try {
      assertName(asset.collection_name);
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "bad name" };
    }
  }

  let need: Map<number, number>;
  try {
    need = countTemplates(recipe.template_ids);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "bad template id" };
  }
  const have = new Map<number, number>();
  const haveOther = new Map<number, number>();
  for (const asset of vault.assets) {
    if (!Number.isInteger(asset.template_id) || asset.template_id < 1) {
      return { ok: false, reason: "bad template id" };
    }
    const bucket = asset.collection_name === recipe.ingredient_collection ? have : haveOther;
    bucket.set(asset.template_id, (bucket.get(asset.template_id) ?? 0) + 1);
  }
  for (const [template, count] of need) {
    if ((have.get(template) ?? 0) >= count) continue;
    if ((haveOther.get(template) ?? 0) > 0) return { ok: false, reason: "wrong collection" };
    return { ok: false, reason: "template mismatch" };
  }
  return { ok: true };
}

export type CraftResult = {
  vault: Vault;
  consumedIds: bigint[];
  ftSpent: bigint;
  burns: UnsignedBurn[];
  mint: UnsignedMint;
  minted: null;
};

function assertMintRead(
  self: string,
  recipe: Recipe,
  collection: ChainCollection | null,
  template: ChainTemplate | null,
): void {
  if (!collection || collection.source !== "chain") throw new Error("not chain sourced");
  if (!template || template.source !== "chain") throw new Error("not chain sourced");
  assertName(collection.collection_name);
  assertName(collection.author);
  if (collection.collection_name !== recipe.output_collection) throw new Error("wrong collection");
  for (const account of collection.authorized_accounts) assertName(account);
  if (collection.author !== self && !collection.authorized_accounts.includes(self)) {
    throw new Error("not a minter");
  }
  assertName(template.collection_name);
  assertName(template.schema_name);
  if (template.collection_name !== recipe.output_collection) throw new Error("wrong collection");
  if (template.schema_name !== recipe.output_schema) throw new Error("wrong schema");
  if (!Number.isInteger(template.template_id) || template.template_id !== recipe.output_template_id) {
    throw new Error("template mismatch");
  }
  if (!Number.isInteger(template.max_supply) || template.max_supply < 0) throw new Error("bad template");
  if (!Number.isInteger(template.issued_supply) || template.issued_supply < 0) throw new Error("bad template");
  if (template.max_supply !== 0 && template.issued_supply >= template.max_supply) throw new Error("template full");
}

function assertBurnable(recipe: Recipe, rows: readonly ChainTemplate[] | null): void {
  if (rows === null) throw new Error("not chain sourced");
  const need = new Set(recipe.template_ids);
  if (rows.length !== need.size) throw new Error("not chain sourced");
  const seen = new Set<number>();
  for (const row of rows) {
    if (!row || row.source !== "chain") throw new Error("not chain sourced");
    if (!Number.isInteger(row.template_id) || seen.has(row.template_id) || !need.has(row.template_id)) {
      throw new Error("not chain sourced");
    }
    seen.add(row.template_id);
    assertName(row.collection_name);
    if (row.collection_name !== recipe.ingredient_collection) throw new Error("wrong collection");
    if (row.burnable !== true) throw new Error("not burnable");
  }
}

/** Debit the recipe and describe the burn and mint. Neither action is sent. PXJ is not burned. Issued supply is not incremented. */
export function craft(
  caller: string,
  vault: Vault | null,
  recipe: Recipe | null,
  self: string,
  collection: ChainCollection | null,
  template: ChainTemplate | null,
  ingredientTemplates: readonly ChainTemplate[] | null,
): CraftResult {
  assertName(self);
  const gate = canCraft(caller, vault, recipe);
  if (!gate.ok) throw new Error(gate.reason);
  if (!vault || !recipe) throw new Error("no vault");
  assertMintRead(self, recipe, collection, template);
  assertBurnable(recipe, ingredientTemplates);
  const need = countTemplates(recipe.template_ids);
  const consumed = new Set<string>();
  for (const [template, count] of need) {
    const matches = vault.assets
      .filter((asset) => asset.template_id === template && asset.collection_name === recipe.ingredient_collection)
      .map((asset) => asset.id)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const id of matches.slice(0, count)) consumed.add(id.toString());
  }
  const consumedIds = [...consumed].map((id) => BigInt(id)).sort((a, b) => (a < b ? -1 : 1));
  return {
    vault: {
      ...vault,
      ft: vault.ft - recipe.ft_required,
      assets: vault.assets.filter((asset) => !consumed.has(asset.id.toString())),
    },
    consumedIds,
    ftSpent: recipe.ft_required,
    burns: consumedIds.map((id) => ({
      account: "atomicassets",
      name: "burnasset",
      authorization: [{ actor: self, permission: "active" }],
      data: { asset_owner: self, asset_id: id.toString() },
      sent: false,
    })),
    mint: {
      account: "atomicassets",
      name: "mintasset",
      authorization: [{ actor: self, permission: "active" }],
      data: {
        authorized_minter: self,
        collection_name: recipe.output_collection,
        schema_name: recipe.output_schema,
        template_id: recipe.output_template_id,
        new_asset_owner: caller,
        immutable_data: [],
        mutable_data: [],
        tokens_to_back: [],
      },
      sent: false,
    },
    minted: null,
  };
}

export function parseQuantity(quantity: string): { amount: bigint; symbol: string } {
  const match = /^([0-9]+)\.([0-9]{1,18}) ([A-Z]{1,7})$/.exec(quantity);
  if (!match) throw new Error("bad quantity");
  const symbol = `${match[2].length},${match[3]}`;
  assertSymbol(symbol);
  const amount = BigInt(match[1] + match[2]);
  if (amount > INT64_MAX) throw new Error("ft cap");
  return { amount, symbol };
}

export function formatQuantity(amount: bigint, symbol: string): string {
  const { precision, code } = assertSymbol(symbol);
  if (amount < 0n || amount > INT64_MAX) throw new Error("ft cap");
  const scale = 10n ** BigInt(precision);
  const whole = amount / scale;
  const frac = (amount % scale).toString().padStart(precision, "0");
  return `${whole}.${frac} ${code}`;
}

export type FtNotify = {
  firstReceiver: string;
  tokenContract: string;
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
  assertName(note.tokenContract);
  if (note.firstReceiver !== note.tokenContract) throw new Error("fake token");
  if (note.from === note.self || note.to !== note.self) return { vault, credited: 0n };
  if (!note.memo.startsWith("blend:")) throw new Error("memo must start with blend:");
  const parsed = parseQuantity(note.quantity);
  if (parsed.amount < 1n) throw new Error("non-positive FT");
  if (!vault) {
    return {
      vault: {
        user: note.from,
        ft: parsed.amount,
        ft_symbol: parsed.symbol,
        ft_contract: note.tokenContract,
        assets: [],
      },
      credited: parsed.amount,
    };
  }
  if (vault.user !== note.from) throw new Error("not the owner");
  if (vault.ft_symbol === "") {
    return {
      vault: { ...vault, assets: vault.assets.slice(), ft: parsed.amount, ft_symbol: parsed.symbol, ft_contract: note.tokenContract },
      credited: parsed.amount,
    };
  }
  if (vault.ft_symbol !== parsed.symbol) throw new Error("mixed symbols");
  if (vault.ft_contract !== note.tokenContract) throw new Error("mixed contracts");
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

export function applyNftNotify(
  vault: Vault | null,
  note: NftNotify,
  chain: readonly ChainAsset[] | null,
): { vault: Vault | null; credited: bigint[] } {
  assertName(note.from);
  assertName(note.to);
  assertName(note.self);
  if (note.firstReceiver !== "atomicassets") throw new Error("fake nft");
  if (note.from === note.self || note.to !== note.self) return { vault, credited: [] };
  if (!note.memo.startsWith("blend:")) throw new Error("memo must start with blend:");
  if (note.assetIds.length === 0 || note.assetIds.length > 20) throw new Error("bad asset batch");
  if (note.templateIds.length !== note.assetIds.length) throw new Error("bad asset batch");
  if (chain === null) throw new Error("not chain sourced");
  if (chain.length !== note.assetIds.length) throw new Error("not chain sourced");

  const byId = new Map<string, ChainAsset>();
  for (const row of chain) {
    if (!row || row.source !== "chain") throw new Error("not chain sourced");
    const key = row.id.toString();
    if (byId.has(key)) throw new Error("duplicate asset");
    byId.set(key, row);
  }

  const incoming: Asset[] = [];
  const seen = new Set<string>((vault?.assets ?? []).map((asset) => asset.id.toString()));
  for (let i = 0; i < note.assetIds.length; i++) {
    const id = note.assetIds[i];
    if (id < 1n || id > UINT64_MAX) throw new Error("bad asset id");
    const key = id.toString();
    if (seen.has(key)) throw new Error("duplicate asset");
    seen.add(key);
    const row = byId.get(key);
    if (!row) throw new Error("missing asset");
    if (row.owner === note.from) throw new Error("stale owner");
    if (row.owner !== note.to) throw new Error("not the owner");
    assertName(row.collection_name);
    if (!Number.isInteger(row.template_id) || row.template_id < 1) throw new Error("bad template id");
    if (note.templateIds[i] !== row.template_id) throw new Error("template mismatch");
    incoming.push({ id, template_id: row.template_id, collection_name: row.collection_name });
  }

  if (!vault) {
    return {
      vault: { user: note.from, ft: 0n, ft_symbol: "", ft_contract: "", assets: incoming },
      credited: incoming.map((asset) => asset.id),
    };
  }
  if (vault.user !== note.from) throw new Error("not the owner");
  return {
    vault: { ...vault, assets: vault.assets.concat(incoming) },
    credited: incoming.map((asset) => asset.id),
  };
}

function copy(vault: Vault): Vault {
  return { ...vault, assets: vault.assets.slice() };
}

/** Book only. The returned transfer is not sent. */
export function withdrawFt(caller: string, vault: Vault | null, amount: bigint, self: string): { vault: Vault; action: UnsignedTransfer } {
  if (!vault) throw new Error("no vault");
  if (caller !== vault.user) throw new Error("not the owner");
  assertName(self);
  assertName(vault.ft_contract);
  if (amount < 1n) throw new Error("non-positive FT");
  if (amount > vault.ft) throw new Error("insufficient FT");
  const quantity = formatQuantity(amount, vault.ft_symbol);
  return {
    vault: { ...copy(vault), ft: vault.ft - amount },
    action: {
      account: vault.ft_contract,
      name: "transfer",
      authorization: [{ actor: self, permission: "active" }],
      data: { from: self, to: vault.user, quantity, memo: "withdraw" },
      sent: false,
    },
  };
}

/** Book only. The returned transfer is not sent. */
export function withdrawNfts(caller: string, vault: Vault | null, assetIds: bigint[], self: string): { vault: Vault; action: UnsignedTransfer } {
  if (!vault) throw new Error("no vault");
  if (caller !== vault.user) throw new Error("not the owner");
  assertName(self);
  if (assetIds.length === 0 || assetIds.length > 20) throw new Error("bad asset batch");
  const held = new Map(vault.assets.map((asset) => [asset.id.toString(), asset]));
  const seen = new Set<string>();
  for (const id of assetIds) {
    const key = id.toString();
    if (seen.has(key)) throw new Error("duplicate asset");
    seen.add(key);
    if (!held.has(key)) throw new Error("missing asset");
  }
  return {
    vault: { ...copy(vault), assets: vault.assets.filter((asset) => !seen.has(asset.id.toString())) },
    action: {
      account: "atomicassets",
      name: "transfer",
      authorization: [{ actor: self, permission: "active" }],
      data: { from: self, to: vault.user, asset_ids: assetIds.map((id) => id.toString()), memo: "withdraw" },
      sent: false,
    },
  };
}
