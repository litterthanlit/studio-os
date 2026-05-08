import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const templateIndex = read("lib/canvas/templates/index.ts");
const tasteRoute = read("app/api/taste/extract/route.ts");
const designPrompt = read("lib/canvas/design-tree-prompt.ts");
const legacyPrompt = read("lib/canvas/generate-site.ts");
const v6Bans = read("lib/canvas/design-archetype-bans.ts");
const v5Bans = read("lib/canvas/archetype-bans.ts");

assert.match(templateIndex, /"culture-event"/, "culture-event must be a selectable site type");
assert.match(tasteRoute, /culture-event:/, "taste extraction must know the culture-event archetype");
assert.match(tasteRoute, /Vibecon/i, "taste extraction should cite the Vibecon-like event pattern");

for (const prompt of [designPrompt, legacyPrompt]) {
  assert.match(prompt, /case "culture-event"/, "generation prompts must branch on culture-event");
  assert.match(prompt, /fixed grid rails/i, "culture-event grammar must require fixed grid rails");
  assert.match(prompt, /oversized masthead/i, "culture-event grammar must require oversized masthead type");
  assert.match(prompt, /lineup/i, "culture-event grammar must include lineup/speaker rhythm");
  assert.match(prompt, /ticket/i, "culture-event grammar must include an event ticket CTA");
}

for (const bans of [v6Bans, v5Bans]) {
  assert.match(bans, /"culture-event"/, "culture-event must receive non-SaaS pattern bans");
}

console.log("culture-event grammar proof passed");
