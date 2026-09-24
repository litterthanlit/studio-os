/**
 * Proof gate 1.8 (unit part; the PR carries a manual QA checklist) — role
 * chips and region lasso update the brief; X-ray / Intent Card / Taste Memory
 * models.
 *
 * 1. Role chips: toggling updates the reference item; "ignore" is exclusive;
 *    keys 1–7 map to the chips. The chip roles reach the engine request and
 *    become explicit roles in the brief (and change its cache key).
 * 2. Region lasso: a dragged rectangle (any direction, through the cover-fit
 *    transform) becomes a normalized region that reaches the brief; slivers
 *    are ignored; removing restores the brief.
 * 3. X-ray: perception summaries round-trip through the run payload and
 *    produce the text facts the overlay lists.
 * 4. Intent Card: measured rows with sources, ignored references, ≤ 1 question.
 * 5. Taste Memory sentences carry scope and evidence.
 *
 * Run: npm run proof:intent-ui
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  REFERENCE_ROLES,
  addReferenceRegion,
  coverTransform,
  intentCardModel,
  normalizeBBox,
  preferenceSentence,
  removeReferenceRegion,
  roleForKey,
  summarizePerception,
  toggleReferenceRole,
  xrayFacts,
} from "../lib/intent/reference-actions";
import { engineReferencesFromItems } from "../lib/engine/references";
import { parseEngineInput } from "../lib/engine/request";
import { briefCacheKey, buildDesignBrief } from "../lib/intent/brief";
import type { ReferencePerception } from "../lib/intent/perceive";

const intentProfile: any = { outputType: "marketing-site", businessGoal: "brand", confidence: 0.8, mustInclude: [], mustAvoid: [], referenceRoles: [], alternatives: [] };

function briefFor(items: any[]) {
  const parsed = parseEngineInput({ projectId: "p", prompt: "Landing page", references: engineReferencesFromItems(items) as any });
  assert.ok(parsed.ok);
  const refs = parsed.input.references;
  return buildDesignBrief({
    prompt: "Landing page",
    intentProfile,
    references: refs.map((r) => ({ id: r.id, weight: r.weight, annotation: r.annotation, roles: r.roles, regions: r.regions })),
    perceptions: {},
  });
}

const refA: any = { id: "ref-a", kind: "reference", imageUrl: "https://img.example/a.png", x: 0, y: 0, width: 400, height: 300, zIndex: 1 };
const refB: any = { id: "ref-b", kind: "reference", imageUrl: "https://img.example/b.png", x: 0, y: 0, width: 400, height: 300, zIndex: 1, annotation: "love the type" };

function testChips() {
  assert.deepEqual(REFERENCE_ROLES.map((r) => r.key), ["1", "2", "3", "4", "5", "6", "7"]);
  assert.equal(roleForKey("2"), "typography");
  assert.equal(roleForKey("8"), null);
  let roles = toggleReferenceRole(undefined, "layout");
  roles = toggleReferenceRole(roles, "color");
  assert.deepEqual(roles, ["layout", "color"]);
  assert.deepEqual(toggleReferenceRole(roles, "ignore"), ["ignore"], "ignore is exclusive");
  assert.deepEqual(toggleReferenceRole(["ignore"], "mood"), ["mood"], "a role clears ignore");
  assert.deepEqual(toggleReferenceRole(roles, "layout"), ["color"], "toggle off");

  const before = briefFor([refA, refB]);
  assert.deepEqual(before.references.map((r) => r.roleSource), ["inferred", "annotation"]);
  const withChips = briefFor([{ ...refA, roles: ["layout", "color"] }, { ...refB, roles: ["ignore"] }]);
  assert.deepEqual(withChips.references[0], { assetId: "ref-a", weight: "default", roles: ["layout", "color"], roleSource: "explicit" });
  assert.deepEqual(withChips.references[1]!.roles, ["ignore"], "chip beats annotation");
  assert.equal(withChips.references[1]!.roleSource, "explicit");
  assert.notEqual(briefCacheKey(withChips), briefCacheKey(before), "chip edit changes the brief cache key");
  console.log("[proof] 1. role chips (keys 1–7, ignore exclusive) → engine request → explicit brief roles; cache key changes");
}

function testLasso() {
  // 1600×900 image in a 400×300 card (object-fit: cover → cropped left/right).
  const fit = coverTransform({ width: 1600, height: 900 }, { width: 400, height: 300 });
  const a = fit.toCard(0.5, 0.2);
  const back = fit.toImage(a.x, a.y);
  assert.ok(Math.abs(back.x - 0.5) < 1e-9 && Math.abs(back.y - 0.2) < 1e-9, "cover transform round-trips");
  assert.ok(fit.toCard(0, 0).x < 0, "cropped edge sits outside the card");
  // Drag bottom-right → top-left on the card.
  const bbox = normalizeBBox(fit.toImage(300, 250), fit.toImage(100, 50));
  assert.ok(bbox.every((n) => n >= 0 && n <= 1));
  assert.ok(bbox[2] > 0 && bbox[3] > 0);
  const regions = addReferenceRegion(undefined, bbox, "typography");
  assert.deepEqual(addReferenceRegion(regions, [0.1, 0.1, 0.01, 0.3], "layout"), regions, "slivers ignored");

  const base = briefFor([{ ...refA, roles: ["layout"] }]);
  const lassoed = briefFor([{ ...refA, roles: ["layout"], regions }]);
  assert.deepEqual(lassoed.references[0]!.regions, [{ bbox, role: "typography" }], "region reaches the brief");
  assert.notEqual(briefCacheKey(lassoed), briefCacheKey(base));
  const removed = briefFor([{ ...refA, roles: ["layout"], regions: removeReferenceRegion(regions, 0) }]);
  assert.equal(briefCacheKey(removed), briefCacheKey(base), "removing the region restores the brief");
  const bad = parseEngineInput({ projectId: "p", prompt: "x", references: [{ url: "https://img.example/a.png", regions: [{ bbox: [0, 0, 2, 1], role: "layout" }, { bbox: [0, 0, 0.5, 0.5], role: "nope" }] }] as any });
  assert.ok(bad.ok && !bad.input.references[0]!.regions, "invalid regions are dropped at the API");
  console.log(`[proof] 2. lasso: card drag → cover-fit → bbox ${JSON.stringify(bbox)} → brief region; slivers / invalid regions dropped`);
}

function testXrayAndCard() {
  const perception = {
    assetId: "ref-a",
    composition: null,
    qualities: [
      { dimension: "typography", label: "oversized serif masthead", evidence: [{ bbox: [0.05, 0.05, 0.6, 0.2] }], confidence: 0.9 },
      { dimension: "mood", label: "faint", evidence: [{ bbox: [0, 0, 1, 1] }], confidence: 0.3 },
    ],
    measured: {
      palette: { swatches: [{ hex: "#111214", role: "background", area: 0.62, oklab: [0.2, 0, 0] }, { hex: "#3DDC97", role: "accent", area: 0.12, oklab: [0.8, 0, 0] }], confidence: 0.9 },
      grid: { columns: 12, columnWidth: 78, gutter: 24, marginLeft: 120, marginRight: 120, width: 1440, confidence: 1 },
      type: { accepted: true, ratio: 1.333, named: "perfect fourth", sizes: [16, 21, 28, 38, 50], residual: 0, confidence: 0.8, boxes: [] },
    },
    mode: "dark",
    confidence: 1,
  } as unknown as ReferencePerception;
  const summary = summarizePerception(perception);
  assert.equal(summary.keyMoves.length, 1, "low-confidence qualities are not pinned");
  assert.deepEqual(JSON.parse(JSON.stringify(summary)), summary, "summary is plain JSON (cached on the item)");
  const facts = xrayFacts(summary);
  assert.deepEqual(facts, [
    "12-column grid · 24px gutter · 120px margins (at 1440px)",
    "Type ratio 1.333 (perfect fourth) · 16 / 21 / 28 / 38 / 50px",
    "Palette background #111214 62%, accent #3DDC97 12%",
    "Dark mode",
    "Key move 1: oversized serif masthead",
  ]);

  const model = intentCardModel(
    {
      references: [
        { assetId: "ref-a", weight: "primary", roles: ["layout"], roleSource: "explicit" },
        { assetId: "ref-b", weight: "primary", roles: ["typography"], roleSource: "annotation" },
        { assetId: "ref-c", weight: "muted", roles: ["ignore"], roleSource: "explicit" },
      ],
      conflicts: [{ dimension: "mode", options: ["dark", "light"] }, { dimension: "density", options: ["compact", "spacious"] }],
      questions: [
        { id: "conflict-mode", prompt: "ref-a is dark and ref-b is light — which mode should the design use?", options: ["dark", "light"] },
        { id: "conflict-density", prompt: "Which density?", options: ["compact", "spacious"] },
      ],
      directives: [
        { dimension: "layout", rule: "Use a 12-column grid with 24px gutters and 120px outer margins (measured at 1440px)", provenance: { source: "measured", refIds: ["ref-a"], confidence: 1 } },
        { dimension: "mood", rule: "mood from ref-a: calm", provenance: { source: "perceived", refIds: ["ref-a"], confidence: 0.6 } },
      ],
    },
    { "ref-a": "A", "ref-b": "B", "ref-c": "C" },
  );
  assert.deepEqual(model.rows.map((r) => [r.text, r.source]), [
    ["Use a 12-column grid with 24px gutters and 120px outer margins", "from A"],
    ["layout ← A", "explicit"],
    ["type ← B", "annotation"],
    ["C ignored", "muted"],
  ]);
  assert.equal(model.question?.id, "conflict-mode", "one question at most");
  const answered = intentCardModel({ references: [], conflicts: [], directives: [], questions: [{ id: "q", prompt: "?", options: ["a"], answer: "a" }] });
  assert.equal(answered.question, null, "answered questions are not asked again");
  console.log(`[proof] 3–4. X-ray facts: ${facts.length} lines; Intent Card: ${model.rows.length} rows + 1 question (of 2 open)`);
}

function testTasteMemoryAndWiring() {
  assert.equal(
    preferenceSentence({ rule: "Primary palette MUST use only: #0b0c0e, #d9480f", scope: { level: "screen" }, evidence: { count: 3 } }),
    "Primary palette should use only: #0b0c0e, #d9480f — this screen · learned from 3 actions",
  );
  assert.match(preferenceSentence({ rule: "Do NOT use stock photos", scope: { level: "user" }, evidence: { count: 1 } }), /^Avoid: use stock photos — all projects · learned from 1 action$/);

  const read = (f: string) => readFileSync(f, "utf8");
  const chips = read("app/canvas-v1/components/intent/RoleChips.tsx");
  assert.match(chips, /aria-pressed=\{pressed\}/);
  assert.match(chips, /role="group"/);
  const keys = read("app/canvas-v1/hooks/useReferenceXray.ts");
  assert.match(keys, /e\.key === "x" \|\| e\.key === "X"/);
  assert.match(keys, /e\.key === "Escape"/);
  assert.match(keys, /metaKey \|\| e\.ctrlKey \|\| e\.altKey \|\| isTyping/, "shortcuts never fire while typing or with modifiers");
  const xray = read("app/canvas-v1/components/intent/ReferenceXray.tsx");
  assert.match(xray, /rgba\(75, 87, 219, 0\.6\)/, "1px #4B57DB at 60%");
  assert.match(xray, /font-mono text-\[10px\]/);
  assert.match(xray, /className="sr-only" aria-label="Reference X-ray facts"/, "facts listed as text");
  const card = read("app/canvas-v1/components/intent/IntentCard.tsx");
  assert.match(card, /mono-kicker/);
  assert.match(card, /min-h-\[40px\]/);
  for (const f of ["RoleChips", "ReferenceXray", "RegionLasso", "IntentCard", "TasteMemoryPanel"]) {
    assert.doesNotMatch(read(`app/canvas-v1/components/intent/${f}.tsx`), /rounded-(xl|lg|full)|backdrop-blur|gradient/, `${f}: design system`);
  }
  const composer = read("app/canvas-v1/components/PromptComposerV2.tsx");
  assert.match(composer, /answers: briefAnswers/, "Intent Card answers reach the next run");
  assert.match(composer, /changes: \{ perception: entry\.summary \}/, "X-ray facts cached on references after a run");
  console.log("[proof] 5. Taste Memory sentences with scope + evidence; chips aria-pressed; X / 1–7 / Esc; facts listed as text; design-system checks");
}

testChips();
testLasso();
testXrayAndCard();
testTasteMemoryAndWiring();
console.log("intent-ui proof passed");
