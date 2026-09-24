/**
 * Proof gate 1.6 — scoped preferences learned from design actions.
 *
 * Real handlers (convex/designMemory.ts on the in-memory FakeConvex), real edit
 * detection (taste-edit-tracker) and the real layered compile.
 *
 * 1. Palette and structural edits create scoped `proposed` preferences
 *    (screen scope; promoted to project on a second screen, to user in a
 *    second project; component-local edits on one node are node-scoped).
 * 2. Accepting one changes the next compile only for in-scope screens.
 * 3. Rejecting one is a no-op for the compile.
 * 4. Copy edits are ignored.
 * 5. Boundaries: idle edits are debounced (latest wins), regenerate flushes at
 *    once, a reverted edit retracts its proposal, repeated idle evidence does not
 *    inflate counts; variant picks and section regenerations are signals queued
 *    by the reducer.
 *
 * Run: npm run proof:preferences
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { installConvexAuthStub, FakeConvex, seedOwner } from "./lib/fake-convex";

installConvexAuthStub();
process.env.CONVEX_INTERNAL_API_SECRET = "proof-secret";

async function main() {
  const dm = await import("../convex/designMemory");
  const { detectTasteEditsFromBaseline, buildGenerationBaseline } = await import("../lib/canvas/taste-edit-tracker");
  const { classifyEdit, createPreferenceRecorder, proposalsFromSignal, screenIdForArtboard } = await import("../lib/taste/preferences");
  const { compileLayeredDirectives, compileLayeredTaste } = await import("../lib/taste/compile");
  const { directivesToPromptText } = await import("../lib/canvas/directive-compiler");
  const { canvasReducer } = await import("../lib/canvas/canvas-reducer");
  const { LEGACY_PROFILES } = await import("./fixtures/legacy-taste-profiles");

  const db = new FakeConvex();
  const ana = seedOwner(db, "ana");
  db.as(ana.userId);
  const secondProject = db.insertRaw("projects", { ownerId: ana.userId, name: "second", slug: "second", color: "#4B57DB", visibility: "private", status: "active", createdAt: db.now(), updatedAt: db.now() });

  // ── Trees ────────────────────────────────────────────────────────────────
  const text = (id: string, content: string, size = 16, font = "Geist") => ({ id, type: "text", name: id, style: { fontSize: size, fontFamily: font, foreground: "#1a1a1a" }, content: { text: content } });
  const card = (id: string) => ({ id, type: "frame", name: `Card ${id}`, style: { display: "flex", flexDirection: "column", background: "#ffffff", padding: { top: 24, right: 24, bottom: 24, left: 24 } }, children: [text(`${id}-t`, "Feature", 18), text(`${id}-b`, "Short description")] });
  const generated = (): any => ({
    id: "root", type: "frame", name: "Page", style: { display: "flex", flexDirection: "column", width: 1440, background: "#faf9f6" },
    children: [
      { id: "hero", type: "frame", name: "Hero", style: { display: "flex", flexDirection: "column", padding: { top: 96, right: 80, bottom: 96, left: 80 }, background: "#faf9f6" }, children: [text("h1", "Small press, big ideas", 72, "Bespoke Serif"), text("p1", "Books worth the shelf.")] },
      { id: "features", type: "frame", name: "Features", style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, padding: { top: 96, right: 80, bottom: 96, left: 80 }, background: "#f1eee8" }, children: [card("c1"), card("c2"), card("c3")] },
      { id: "footer", type: "frame", name: "Footer", style: { display: "flex", padding: { top: 96, right: 80, bottom: 96, left: 80 }, background: "#1a1a1a" }, children: [text("f1", "© Small Press", 14)] },
    ],
  });
  const baseline = buildGenerationBaseline(generated(), "2026-09-24T00:00:00.000Z");
  const recolor = (tree: any) => {
    const map: Record<string, string> = { "#faf9f6": "#0b0c0e", "#f1eee8": "#15171a", "#1a1a1a": "#d9480f" };
    const walk = (n: any) => {
      if (n.style?.background && map[n.style.background]) n.style.background = map[n.style.background];
      n.children?.forEach(walk);
    };
    walk(tree);
    return tree;
  };
  const withoutCards = (tree: any) => ({ ...tree, children: tree.children.filter((c: any) => c.id !== "features") });
  const copyEdited = (tree: any) => {
    const walk = (n: any) => {
      if (n.type === "text") n.content = { text: `${n.content.text} — revised copy` };
      n.children?.forEach(walk);
    };
    walk(tree);
    return tree;
  };

  const SCREEN_A = screenIdForArtboard({ siteId: "site-1", name: "Home" });
  const SCREEN_B = screenIdForArtboard({ siteId: "site-1", name: "About" });

  // A recorder wired to the real Convex handlers.
  const scheduled: Array<{ fn: () => void; cancelled: boolean }> = [];
  const known = async (projectId = ana.projectId) => db.run(dm.listPreferences, { projectId, includeOwnerEvidence: true });
  let knownCache: any[] = [];
  const refresh = async (projectId = ana.projectId) => { knownCache = await known(projectId); };
  const recorderFor = (projectId: any) => createPreferenceRecorder({
    projectId,
    known: () => knownCache,
    propose: async (proposal) => {
      const out = await db.run(dm.proposePreference, { projectId, ...proposal });
      await refresh(projectId);
      return out;
    },
    retract: async (preferenceId) => {
      await db.run(dm.setPreferenceStatus, { projectId, preferenceId, status: "rejected" });
      await refresh(projectId);
    },
    schedule: (fn) => {
      const entry = { fn, cancelled: false };
      scheduled.push(entry);
      return () => { entry.cancelled = true; };
    },
  });
  const runTimers = async () => {
    for (const entry of scheduled.splice(0)) if (!entry.cancelled) entry.fn();
    await new Promise((r) => setTimeout(r, 10));
  };
  const recorder = recorderFor(ana.projectId);
  const signal = (screenId: string, boundary: "idle" | "regenerate" | "approve", tree: any, id: string) => ({
    kind: "edits" as const, boundary, id, at: 1, screenId, edits: detectTasteEditsFromBaseline(tree, baseline),
  });

  // ── 4. Copy edits are ignored ────────────────────────────────────────────
  const copyEdits = detectTasteEditsFromBaseline(copyEdited(generated()), baseline);
  assert.ok(copyEdits.every((e) => classifyEdit(e) === "content"), `copy edits are content (${copyEdits.map((e) => e.dimension)})`);
  await recorder.record(signal(SCREEN_A, "regenerate", copyEdited(generated()), "copy-1"));
  assert.equal((await known()).length, 0, "copy edits create no preferences");
  const contentOnly = proposalsFromSignal({ kind: "edits", boundary: "approve", id: "c", at: 1, screenId: SCREEN_A, edits: [{ dimension: "copyDensity", before: 0.3, after: 0.6, description: "More copy" }, { dimension: "imagerySubject", before: "people", after: "books", description: "Subject" }] });
  assert.deepEqual(contentOnly, [], "copy density / imagery subject edits are content");
  console.log("[proof] 4. copy edits (text content, copy density, image subject) create no preferences");

  // ── 1. Palette + structural edits → scoped proposals ─────────────────────
  // Idle edits debounce: nothing is written until the idle timer fires; the latest edit set wins.
  await recorder.record(signal(SCREEN_A, "idle", recolor(generated()), "idle:a:1"));
  assert.equal((await known()).length, 0, "idle edits are debounced");
  await recorder.record(signal(SCREEN_A, "idle", withoutCards(recolor(generated())), "idle:a:1"));
  await runTimers();
  let rows = await known();
  const palette = rows.find((p: any) => p.dimension === "palette");
  assert.ok(palette, `palette proposal (${rows.map((p: any) => p.dimension)})`);
  assert.deepEqual([palette.status, palette.scope.level, palette.scope.targetId, palette.origin], ["proposed", "screen", SCREEN_A, "human-edit"]);
  const structural = rows.filter((p: any) => p.dimension === "knobs" || p.dimension === "avoid");
  assert.ok(structural.length > 0, "structural edit (removed card grid) → proposal");
  assert.ok(structural.every((p: any) => p.scope.level === "screen" && p.scope.targetId === SCREEN_A && p.status === "proposed"));

  // Repeating the same idle evidence (reload) does not inflate evidence.
  await recorder.record(signal(SCREEN_A, "idle", withoutCards(recolor(generated())), "idle:a:1"));
  await runTimers();
  const again = (await known()).find((p: any) => p.dimension === "palette");
  assert.equal(again.evidence.count, 1, "same evidence id is not double-counted");

  // Same palette on a second screen → project scope; in a second project → user scope.
  await recorder.record(signal(SCREEN_B, "regenerate", withoutCards(recolor(generated())), "regen:b:1"));
  rows = await known();
  assert.ok(rows.some((p: any) => p.dimension === "palette" && p.scope.level === "project"), "second screen promotes to project scope");
  await refresh(secondProject);
  const recorder2 = recorderFor(secondProject);
  await recorder2.record(signal("site-9:Home", "regenerate", withoutCards(recolor(generated())), "regen:p2:1"));
  const second = await known(secondProject);
  assert.ok(second.some((p: any) => p.dimension === "palette" && p.scope.level === "user" && p.projectId === secondProject), "second project promotes to user scope");
  await refresh();

  // Component-local edit on exactly one node → node scope.
  const nodeScoped = proposalsFromSignal({
    kind: "edits", boundary: "idle", id: "n", at: 1, screenId: SCREEN_A, nodeIds: ["cta-1"],
    edits: [{ dimension: "buttonToTextLink", before: 2, after: 0, description: "Button → text link", confidence: 0.7, suggestedOverride: { components: { ctaProminence: 0.2 } } as any }],
  });
  assert.deepEqual(nodeScoped[0]!.scope, { level: "node", targetId: "cta-1" });
  console.log(`[proof] 1. palette + structural edits → proposed, screen-scoped (${structural.map((p: any) => p.dimension).join(", ")}); 2nd screen → project, 2nd project → user, one-node edit → node`);

  // ── 2. Accept → next compile changes only for in-scope screens ───────────
  const profile = LEGACY_PROFILES.editorial;
  const compileFor = async (screenId?: string, projectId = ana.projectId) => {
    const accepted = await db.run(dm.listPreferences, { projectId, status: "accepted", includeUserScope: true });
    const layered = compileLayeredTaste({ derived: profile, learned: accepted, scope: { projectId, ...(screenId ? { screenId } : {}) } });
    return directivesToPromptText(compileLayeredDirectives(layered, "balanced"));
  };
  const before = { a: await compileFor(SCREEN_A), b: await compileFor(SCREEN_B), none: await compileFor() };
  const screenPalette = rows.find((p: any) => p.dimension === "palette" && p.scope.level === "screen")!;
  await db.run(dm.setPreferenceStatus, { projectId: ana.projectId, preferenceId: screenPalette.id, status: "accepted" });
  const after = { a: await compileFor(SCREEN_A), b: await compileFor(SCREEN_B), none: await compileFor() };
  assert.notEqual(after.a, before.a, "accepted screen preference changes that screen's compile");
  assert.match(after.a, /#0b0c0e/);
  assert.equal(after.b, before.b, "other screens unchanged");
  assert.equal(after.none, before.none, "new screens unchanged");
  console.log("[proof] 2. accepting a screen-scoped palette changes the next compile for that screen only");

  // ── 3. Reject → no-op ────────────────────────────────────────────────────
  const beforeReject = { a: await compileFor(SCREEN_A), b: await compileFor(SCREEN_B) };
  const toReject = (await known()).filter((p: any) => p.status === "proposed" && p.projectId === ana.projectId);
  assert.ok(toReject.length > 0);
  for (const p of toReject) await db.run(dm.setPreferenceStatus, { projectId: ana.projectId, preferenceId: p.id, status: "rejected" });
  assert.deepEqual({ a: await compileFor(SCREEN_A), b: await compileFor(SCREEN_B) }, beforeReject, "rejecting proposals changes no compile");
  console.log(`[proof] 3. rejecting ${toReject.length} proposals is a no-op for the compile`);

  // ── 5. Revert retracts; reducer queues picks + section regenerations ─────
  const db2Screen = "site-2:Pricing";
  await recorder.record(signal(db2Screen, "idle", recolor(generated()), "idle:p:1"));
  await runTimers();
  const open = (await known()).find((p: any) => p.scope.targetId === db2Screen && p.dimension === "palette");
  assert.equal(open?.status, "proposed");
  await recorder.record(signal(db2Screen, "idle", generated(), "idle:p:1")); // undo back to the generated colors
  const retracted = (await known()).find((p: any) => p.id === open.id);
  assert.equal(retracted.status, "rejected", "a reverted edit retracts its open proposal");

  let state: any = {
    items: [{ id: "ab1", kind: "artboard", siteId: "site-1", name: "Home", breakpoint: "desktop", pageTree: generated(), x: 0, y: 0, width: 1440, height: 900 }],
    variantPreview: { itemId: "ab1", activeIndex: 0, variants: [{ tree: generated(), label: "Base", changesSummary: "" }, { tree: recolor(generated()), label: "Pushed", changesSummary: "" }] },
    history: { entries: [], cursor: -1, max: 50 },
    updatedAt: "",
  };
  state = canvasReducer(state, { type: "PICK_VARIANT", variantIndex: 1 });
  state = canvasReducer(state, { type: "RECORD_DESIGN_SIGNAL", signal: { kind: "section-regenerate", screenId: SCREEN_A, sectionName: "Features", intent: "different" } });
  assert.deepEqual(state.designSignals.map((s: any) => s.kind), ["variant-pick", "section-regenerate"]);
  assert.deepEqual([state.designSignals[0].screenId, state.designSignals[0].picked, state.designSignals[0].rejected], [SCREEN_A, "Pushed", ["Base"]]);
  for (const s of state.designSignals) await recorder.record(s);
  state = canvasReducer(state, { type: "CLEAR_DESIGN_SIGNALS", ids: state.designSignals.map((s: any) => s.id) });
  assert.equal(state.designSignals.length, 0);
  rows = await known();
  assert.ok(rows.some((p: any) => p.dimension === "variantDirection" && p.value === "pushed" && p.origin === "variant-pick" && p.scope.targetId === SCREEN_A));
  assert.ok(rows.some((p: any) => p.dimension === "avoid" && /Features/.test(p.value) && p.origin === "inferred"));
  for (const file of ["lib/canvas/canvas-persistence.ts", "lib/canvas/canvas-convex-sync.ts"]) {
    assert.match((await import("node:fs")).readFileSync(file, "utf8"), /designSignals: undefined/, `${file} never persists the signal queue`);
  }
  console.log("[proof] 5. idle debounced, regenerate immediate, revert retracts, repeat evidence not inflated; picks + section regens queued by the reducer");
  console.log("preferences proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
