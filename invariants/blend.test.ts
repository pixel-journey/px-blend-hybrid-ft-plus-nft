import { test } from "node:test";
import assert from "node:assert/strict";
import { canCraft } from "./blend.ts";

const recipe = { id: 1, ft_required: 100, template_ids: [42] };
const vault = { user: "alice", ft: 100, asset_ids: [1001] };

test("owner with sufficient ingredients may craft", () => {
  const r = canCraft("alice", vault, recipe);
  assert.equal(r.ok, true);
});

test("non-owner is refused", () => {
  const r = canCraft("bob", vault, recipe);
  assert.equal(r.ok, false);
  assert.match(r.reason, /owner/);
});

test("insufficient FT is refused", () => {
  const r = canCraft("alice", { ...vault, ft: 50 }, recipe);
  assert.equal(r.ok, false);
  assert.match(r.reason, /insufficient/);
});

test("non-positive FT is refused", () => {
  const r = canCraft("alice", { ...vault, ft: 0 }, recipe);
  assert.equal(r.ok, false);
});

test("missing vault is refused", () => {
  const r = canCraft("alice", null, recipe);
  assert.equal(r.ok, false);
});
