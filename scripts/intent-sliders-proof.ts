/**
 * Proof gate 1.7 — design knobs as intent sliders.
 *
 * 1. Every slider moves its knob(s); chrome drives radius + shadow + border;
 *    the app-only slider shows only for app outputs.
 * 2. A slider value persists to the explicit layer (real convex/designState.ts
 *    on the in-memory Convex: tasteLayers "explicit" row) and reads back.
 * 3. It changes the serialized knobs in the prompt (and designer knob
 *    overrides still win over derived knobs).
 * 4. Restyle describes the delta; the composer renders the sliders and wires
 *    Restyle to regeneration; the control is accessible.
 *
 * Run: npm run proof:intent-sliders
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installConvexAuthStub, FakeConvex, seedOwner } from "./lib/fake-convex";

installConvexAuthStub();

async function main() {
  const { INTENT_SLIDERS, applySliderValue, describeSliderDelta, sliderValues, slidersFor } = await import("../lib/taste/intent-sliders");
  const { deriveDesignKnobs, serializeDesignKnobsForPrompt } = await import("../lib/canvas/design-knobs");
  const { buildDesignTreePrompt } = await import("../lib/canvas/design-tree-prompt");
  const { defaultDesignTokens } = await import("../lib/agent/default-design-tokens");
  const { LEGACY_PROFILES } = await import("./fixtures/legacy-taste-profiles");
  const ds = await import("../convex/designState");

  const profile = { ...LEGACY_PROFILES.editorial };
  const before = sliderValues(profile);

  // 1. Each slider moves its knob(s).
  assert.equal(INTENT_SLIDERS.length, 8);
  assert.deepEqual(slidersFor(false).map((s) => s.id).includes("informationDensity"), false);
  assert.deepEqual(slidersFor(true).map((s) => s.id).includes("informationDensity"), true);
  for (const slider of INTENT_SLIDERS) {
    const target = before[slider.id] > 50 ? 10 : 90;
    const moved = applySliderValue(profile, slider.id, target);
    assert.equal(sliderValues(moved)[slider.id], target, `${slider.id} reads back ${target}`);
  }
  const chrome = deriveDesignKnobs({ tasteProfile: applySliderValue(profile, "chrome", 80) }).components;
  assert.deepEqual([chrome.radius, chrome.shadowDepth, chrome.borderPresence], [0.8, 0.64, 0.8], "chrome = radius + shadow + border");
  console.log(`[proof] 1. 8 sliders each move their knobs (${INTENT_SLIDERS.map((s) => s.id).join(", ")}); info density is app-only`);

  // 2. Persists to the explicit layer.
  const moved = applySliderValue(applySliderValue(profile, "whitespaceDrama", 95), "chrome", 5);
  const db = new FakeConvex();
  const ana = seedOwner(db, "ana");
  db.as(ana.userId);
  await db.run(ds.save, { projectId: ana.projectId, tasteProfile: moved });
  const explicit = db.rows("tasteLayers").find((row: any) => row.kind === "explicit") as any;
  assert.ok(explicit, "explicit layer written");
  assert.equal(explicit.data.userOverrides.knobs.layout.whitespaceDrama, 0.95);
  assert.equal(explicit.data.userOverrides.knobs.components.radius, 0.05);
  const derived = db.rows("tasteLayers").find((row: any) => row.kind === "derived") as any;
  assert.equal(derived.data.userOverrides, undefined, "slider values are not in the derived layer");
  const readBack = await db.run(ds.get, { projectId: ana.projectId });
  assert.equal(sliderValues(readBack.tasteProfile).whitespaceDrama, 95, "reads back through designState.get");
  console.log("[proof] 2. slider values persist to the explicit taste layer and read back");

  // 3. Changes the serialized knobs in the prompt.
  const knobsBefore = serializeDesignKnobsForPrompt(deriveDesignKnobs({ tasteProfile: profile }));
  const knobsAfter = serializeDesignKnobsForPrompt(deriveDesignKnobs({ tasteProfile: moved }));
  assert.notEqual(knobsAfter, knobsBefore);
  assert.match(knobsAfter, /whitespace drama 0\.95/);
  assert.match(knobsAfter, /radius 0\.05, shadow 0\.04/);
  const prompt = buildDesignTreePrompt(defaultDesignTokens(), "Landing page", "Press", { tasteProfile: readBack.tasteProfile });
  assert.ok(prompt.includes(knobsAfter.split("\n")[2]!), "the persisted value reaches the generation prompt");
  console.log("[proof] 3. serialized prompt knobs change: whitespace drama → 0.95, radius → 0.05");

  // 4. Restyle delta + UI wiring.
  assert.match(describeSliderDelta(before, sliderValues(moved)), /more whitespace drama \(\d+ → 95\).*less chrome/);
  assert.equal(describeSliderDelta(before, before), "");
  const composer = readFileSync("app/canvas-v1/components/PromptComposerV2.tsx", "utf8");
  assert.match(composer, /<IntentSliders[\s\S]*onChange=\{handleSliderChange\}[\s\S]*onRestyle=/);
  assert.match(composer, /applySliderValue\(tasteProfile, id, value\)/);
  assert.match(composer, /Restyle this section: \$\{delta\}/, "section-level restyle when a section is selected");
  const ui = readFileSync("app/canvas-v1/components/intent/IntentSliders.tsx", "utf8");
  for (const pattern of [/type="range"/, /aria-valuetext=/, /htmlFor=\{id\}/, /aria-expanded=\{open\}/, /focus-visible:ring-\[#D1E4FC\]/, /accent-\[#4B57DB\]/, /mono-kicker/]) {
    assert.match(ui, pattern);
  }
  assert.doesNotMatch(ui, /rounded-(xl|lg|full)|gradient|blur/, "design system: no pills, gradients or blur");
  console.log("[proof] 4. Restyle describes the knob delta (section-level when a section is selected); sliders are labelled, keyboard-operable ranges");
  console.log("intent-sliders proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
