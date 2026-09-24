/**
 * Proof gate 1.1 — Design Memory tables and access paths.
 *
 * Runs the real convex/designMemory.ts, convex/designState.ts and
 * convex/generationRuns.ts handlers against an in-memory Convex (scripts/lib/fake-convex.ts).
 *
 * 1. Owner isolation: another user (or no user) cannot read or write a project's
 *    briefs, taste layers, token sets, preferences or reference analyses.
 * 2. Agent paths: …ForAgent needs the service secret; …ForUserAgent also needs
 *    the acting user to own the project. The server client picks the right variant.
 * 3. Migration from the 0.4 projectDesignState row is idempotent, and the 0.4
 *    designState API reads the same taste profile / tokens before and after it.
 * 4. Briefs are versioned (≤ 3 questions); preference proposals merge evidence;
 *    snapshots carry only accepted preferences; generation runs checkpoint steps.
 *
 * Run: npm run proof:design-memory
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { installConvexAuthStub, FakeConvex, seedOwner } from "./lib/fake-convex";

installConvexAuthStub();
process.env.CONVEX_INTERNAL_API_SECRET = "proof-secret";

const taste = {
  summary: "Editorial restraint",
  adjectives: ["editorial"],
  archetypeMatch: "editorial-brand",
  confidence: 0.8,
  userOverrides: { palette: ["#101010", "#f5f0e8"], knobs: { components: { cardGridLikelihood: 0.05 } } },
};
const tokens = { colors: { accent: "#8A6F4D", background: "#FAF9F6" }, typography: { fontFamily: "Bespoke Serif" } };

async function main() {
  const dm = await import("../convex/designMemory");
  const ds = await import("../convex/designState");
  const runs = await import("../convex/generationRuns");
  const { resolveDesignMemoryFunction } = await import("../lib/design-memory/client");

  const db = new FakeConvex();
  const ana = seedOwner(db, "ana");
  const bob = seedOwner(db, "bob");

  // ── 1. Owner isolation ─────────────────────────────────────────────────
  db.as(ana.userId);
  await db.run(dm.saveTasteLayer, { projectId: ana.projectId, kind: "explicit", data: { userOverrides: { density: "dense" } }, provenance: [{ source: "explicit", confidence: 1 }] });
  await db.run(dm.saveTokenSet, { projectId: ana.projectId, tokens });
  await db.run(dm.saveReferenceAnalysis, { projectId: ana.projectId, assetHash: "a".repeat(64), analyzerVersion: "v1", measured: { palette: ["#fff"] }, perceived: {}, confidence: 0.9 });
  const { preferenceId } = await db.run(dm.proposePreference, {
    projectId: ana.projectId, dimension: "ctaStyle", rule: "Prefer text-link CTAs", value: "text-link",
    scope: { level: "project" }, eventIds: ["e1"], confidence: 0.6, origin: "human-edit",
  });

  db.as(bob.userId);
  assert.match(await db.fails(dm.getSnapshot, { projectId: ana.projectId }), /PROJECT_FORBIDDEN/);
  assert.match(await db.fails(dm.saveBrief, { projectId: ana.projectId, brief: { goal: "hijack" } }), /PROJECT_FORBIDDEN/);
  assert.match(await db.fails(dm.saveTasteLayer, { projectId: ana.projectId, kind: "derived", data: {}, provenance: [] }), /PROJECT_FORBIDDEN/);
  assert.match(await db.fails(dm.listPreferences, { projectId: ana.projectId }), /PROJECT_FORBIDDEN/);
  assert.match(await db.fails(dm.setPreferenceStatus, { projectId: bob.projectId, preferenceId, status: "accepted" }), /PREFERENCE_NOT_FOUND/, "cannot reach another project's preference through your own project");
  assert.match(await db.fails(ds.get, { projectId: ana.projectId }), /PROJECT_FORBIDDEN/);
  const bobCache = await db.run(dm.getReferenceAnalysis, { projectId: bob.projectId, assetHash: "a".repeat(64), analyzerVersion: "v1" });
  assert.equal(bobCache, null, "reference-analysis cache is per owner");
  db.as(null);
  assert.match(await db.fails(dm.getSnapshot, { projectId: ana.projectId }), /UNAUTHENTICATED/);
  console.log("[proof] 1. owner isolation: other users and signed-out callers are refused; analysis cache is per owner");

  // ── 2. Agent paths ─────────────────────────────────────────────────────
  const viaAgent = await db.run(dm.getSnapshotForAgent, { projectId: ana.projectId, serviceSecret: "proof-secret" });
  assert.equal(viaAgent.tokenSets[0].tokens.typography.fontFamily, "Bespoke Serif");
  assert.match(await db.fails(dm.getSnapshotForAgent, { projectId: ana.projectId, serviceSecret: "wrong" }), /FORBIDDEN/);
  const viaUserAgent = await db.run(dm.getSnapshotForUserAgent, { projectId: ana.projectId, actingUserId: ana.userId, serviceSecret: "proof-secret" });
  assert.equal(viaUserAgent.projectId, ana.projectId);
  assert.match(await db.fails(dm.getSnapshotForUserAgent, { projectId: ana.projectId, actingUserId: bob.userId, serviceSecret: "proof-secret" }), /PROJECT_FORBIDDEN/);
  await db.run(dm.saveBriefForUserAgent, { projectId: ana.projectId, actingUserId: ana.userId, serviceSecret: "proof-secret", brief: { goal: "agent brief" } });

  assert.deepEqual(resolveDesignMemoryFunction({ serviceSecret: "s", actingUserId: "u" }, "saveBrief"), { name: "saveBriefForUserAgent", args: { serviceSecret: "s", actingUserId: "u" } });
  assert.deepEqual(resolveDesignMemoryFunction({ serviceSecret: "s" }, "getSnapshot"), { name: "getSnapshotForAgent", args: { serviceSecret: "s" } });
  assert.deepEqual(resolveDesignMemoryFunction({ bearerToken: "jwt" }, "getSnapshot"), { name: "getSnapshot", args: {} });
  for (const name of Object.keys(dm).filter((key) => !/ForAgent$|ForUserAgent$/.test(key) && (dm as any)[key]?._handler)) {
    assert.ok((dm as any)[`${name}ForAgent`]?._handler && (dm as any)[`${name}ForUserAgent`]?._handler, `${name} has agent variants`);
  }
  console.log("[proof] 2. agent paths: service secret required; user-agent must own the project; every function has both variants");

  // ── 3. Migration from projectDesignState (0.4) ─────────────────────────
  const carol = seedOwner(db, "carol");
  db.insertRaw("projectDesignState", {
    ownerId: carol.userId, projectId: carol.projectId, tasteProfile: taste, designTokens: tokens,
    tasteUpdatedAt: 100, tokensUpdatedAt: 100, createdAt: 100, updatedAt: 100,
  });
  db.as(carol.userId);
  const before = await db.run(ds.get, { projectId: carol.projectId });
  assert.deepEqual(before.tasteProfile, taste, "legacy row is readable before migration");

  const first = await db.run(dm.migrateProjectDesignState, { projectId: carol.projectId });
  assert.deepEqual(first, { migrated: true, layers: 2, tokenSet: true });
  const layersAfterFirst = JSON.stringify(db.rows("tasteLayers").filter((r) => r.projectId === carol.projectId));
  const second = await db.run(dm.migrateProjectDesignState, { projectId: carol.projectId });
  assert.deepEqual(second, { migrated: false, layers: 0, tokenSet: false }, "second migration is a no-op");
  assert.equal(JSON.stringify(db.rows("tasteLayers").filter((r) => r.projectId === carol.projectId)), layersAfterFirst);
  assert.equal(db.rows("tokenSets").filter((r) => r.projectId === carol.projectId).length, 1);

  const kinds = db.rows("tasteLayers").filter((r) => r.projectId === carol.projectId).map((r) => r.kind).sort();
  assert.deepEqual(kinds, ["derived", "explicit"], "userOverrides become the explicit layer");
  const after = await db.run(ds.get, { projectId: carol.projectId });
  assert.deepEqual(after.tasteProfile, taste, "designState.get reads the same profile from layers");
  assert.deepEqual(after.designTokens, tokens);

  await db.run(ds.save, { projectId: carol.projectId, tasteProfile: { ...taste, userOverrides: undefined, summary: "Refreshed" } });
  const saved = await db.run(ds.get, { projectId: carol.projectId });
  assert.equal(saved.tasteProfile.summary, "Refreshed");
  assert.equal(saved.tasteProfile.userOverrides, undefined, "saving without overrides clears the explicit layer");
  const third = await db.run(dm.migrateProjectDesignState, { projectId: carol.projectId });
  assert.equal(third.migrated, false, "migration never overwrites newer Design Memory rows");
  assert.equal((await db.run(ds.get, { projectId: carol.projectId })).tasteProfile.summary, "Refreshed");
  const viaAgentState = await db.run(ds.getForAgent, { projectId: carol.projectId, serviceSecret: "proof-secret" });
  assert.equal(viaAgentState.tasteProfile.summary, "Refreshed", "agents read the migrated state");
  console.log("[proof] 3. migration idempotent (2 layers + token set, then no-ops); 0.4 designState API reads the same data");

  // ── 4. Briefs, preferences, runs ───────────────────────────────────────
  db.as(ana.userId);
  const v2 = await db.run(dm.saveBrief, { projectId: ana.projectId, brief: { goal: "Landing page", questions: [1, 2, 3, 4, 5].map((n) => ({ id: `q${n}`, prompt: "?", options: [] })) } });
  assert.equal(v2.version, 2, "briefs are versioned");
  const snap = await db.run(dm.getSnapshot, { projectId: ana.projectId });
  assert.equal(snap.brief.version, 2);
  assert.equal(snap.brief.questions.length, 3, "at most 3 questions");
  assert.equal(snap.preferences.length, 0, "proposed preferences are not in the snapshot");

  const merged = await db.run(dm.proposePreference, {
    projectId: ana.projectId, dimension: "ctaStyle", rule: "Prefer text-link CTAs", value: "text-link",
    scope: { level: "project" }, eventIds: ["e2"], confidence: 0.7, origin: "human-edit",
  });
  assert.deepEqual(merged, { preferenceId, merged: true });
  const [pref] = await db.run(dm.listPreferences, { projectId: ana.projectId, status: "proposed" });
  assert.equal(pref.evidence.count, 2, "evidence accumulates");
  await db.run(dm.setPreferenceStatus, { projectId: ana.projectId, preferenceId, status: "accepted" });
  assert.equal((await db.run(dm.getSnapshot, { projectId: ana.projectId })).preferences.length, 1, "accepted preference reaches the snapshot");

  const runId = await db.run(runs.create, { projectId: ana.projectId, kind: "screen", input: { prompt: "x" }, inputHash: "h1", stepKeys: ["brief", "generate"] });
  await db.run(runs.update, { runId, stepKey: "brief", stepStatus: "done", checkpoint: { briefId: "b1" } });
  await db.run(runs.update, { runId, status: "complete", output: { kind: "tree", ref: "artboard-1" } });
  const run = await db.run(runs.get, { runId });
  assert.equal(run.steps.find((s: any) => s.key === "brief").status, "done");
  assert.deepEqual(run.steps.find((s: any) => s.key === "brief").checkpoint, { briefId: "b1" });
  assert.equal(run.outputs[0].ref, "artboard-1");
  assert.deepEqual(run.missingScreenIds, [], "get_run shape preserved");
  db.as(bob.userId);
  assert.match(await db.fails(runs.get, { runId }), /PROJECT_FORBIDDEN/);
  console.log("[proof] 4. briefs versioned (≤3 questions); preferences merge evidence; runs checkpoint steps");

  console.log("design-memory proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
