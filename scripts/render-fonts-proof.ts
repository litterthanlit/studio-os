/**
 * Proof gate 0.1 — design fonts load in screenshots and exports.
 *
 * 1. Font collection covers style + responsiveOverrides, skips generic/system stacks,
 *    and resolves Google vs Fontshare links (the base family is `Geist`, not `Geist Sans`).
 * 2. Document-mode HTML (ZIP + publish) contains the font links; fragments stay link-free.
 * 3. Inside the real screenshot page, a serif display font passes `document.fonts.check`
 *    (skips cleanly when Chromium or the font CDN is unavailable).
 *
 * Run: npm run proof:render-fonts
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import type { DesignNode } from "../lib/canvas/design-node";
import { designNodeToHTML } from "../lib/canvas/design-node-to-html";
import {
  buildDesignFontLinks,
  collectDesignFontFamilies,
  googleFontHref,
  primaryFontFamily,
} from "../lib/canvas/font-links";
import {
  buildScreenshotDocument,
  renderDesignNodeScreenshot,
} from "../lib/canvas/design-node-screenshot";

const SERIF_DISPLAY = "Playfair Display";

const sampleTree: DesignNode = {
  id: "fonts-root",
  type: "frame",
  name: "Page",
  style: {
    display: "flex",
    flexDirection: "column",
    width: 1440,
    background: "#FAFAF8",
    padding: { top: 96, right: 64, bottom: 96, left: 64 },
    gap: 24,
  },
  children: [
    {
      id: "headline",
      type: "text",
      name: "Headline",
      content: { text: "Slow bread, early mornings" },
      style: { fontFamily: `"${SERIF_DISPLAY}", serif`, fontSize: 88, fontWeight: 500, foreground: "#1A1A1A" },
    },
    {
      id: "body",
      type: "text",
      name: "Body",
      content: { text: "Sourdough baked daily in small batches." },
      style: { fontFamily: "Inter, system-ui, sans-serif", fontSize: 18, foreground: "#6B6B6B" },
      responsiveOverrides: { mobile: { fontFamily: "'Bespoke Serif', serif" } },
    },
    {
      id: "system",
      type: "text",
      name: "System",
      content: { text: "System stack only" },
      style: { fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", fontSize: 14 },
    },
    {
      id: "dupe",
      type: "text",
      name: "Duplicate",
      content: { text: "Same serif again" },
      style: { fontFamily: `'${SERIF_DISPLAY}'`, fontSize: 32 },
    },
  ],
};

function checkCollection() {
  assert.equal(primaryFontFamily(`"Playfair Display", serif`), "Playfair Display");
  assert.equal(primaryFontFamily("serif"), "serif");

  const families = collectDesignFontFamilies(sampleTree);
  assert.deepEqual(families, [SERIF_DISPLAY, "Inter", "Bespoke Serif"]);

  const links = buildDesignFontLinks(families);
  const bySource = Object.fromEntries(links.map((l) => [l.family, l]));
  assert.equal(bySource[SERIF_DISPLAY]!.source, "google");
  assert.match(bySource[SERIF_DISPLAY]!.href, /fonts\.googleapis\.com\/css2\?family=Playfair\+Display:wght@/);
  assert.equal(bySource["Bespoke Serif"]!.source, "fontshare");
  assert.match(bySource["Bespoke Serif"]!.href, /api\.fontshare\.com\/v2\/css\?f\[\]=bespoke-serif@/);

  const screenshotDoc = buildScreenshotDocument(sampleTree);
  assert.ok(!screenshotDoc.includes("Geist+Sans"), "screenshot wrapper must not request `Geist Sans` (HTTP 400)");
  assert.match(screenshotDoc, /fonts\.googleapis\.com\/css2\?family=Geist:wght@/, "screenshot wrapper loads the Geist base font");
  assert.ok(screenshotDoc.includes("Playfair+Display"), "screenshot wrapper links the design serif");
  console.log("[proof] font collection + link resolution OK:", families.join(", "));
}

function checkExports() {
  const doc = designNodeToHTML(sampleTree, { outputMode: "document" });
  assert.match(doc, /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Playfair\+Display[^"]*" rel="stylesheet">/);
  assert.match(doc, /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[^"]*" rel="stylesheet">/);
  assert.match(doc, /<link href="https:\/\/api\.fontshare\.com\/v2\/css\?f\[\]=bespoke-serif[^"]*" rel="stylesheet">/);
  assert.ok(doc.indexOf("fonts.googleapis.com") < doc.indexOf("</head>"), "font links live in <head>");

  const fragment = designNodeToHTML(sampleTree);
  assert.ok(!fragment.includes("<link"), "fragments stay link-free for embedding");

  const noFonts = designNodeToHTML(
    { id: "plain", type: "frame", name: "Plain", style: {}, children: [] },
    { outputMode: "document" },
  );
  assert.ok(!noFonts.includes("<link"), "trees without web fonts emit no links");

  // ZIP + publish always export document mode, and the published CSP must let the stylesheets load.
  const exportTab = readFileSync("app/canvas-v1/components/inspector/ExportTab.tsx", "utf8");
  assert.match(exportTab, /htmlForZip = designNodeToHTML\(exportRoot, \{ outputMode: "document" \}\)/);
  assert.match(exportTab, /designNodeToHTML\(exportRoot, \{ outputMode: "document" \}\)\s*:\s*""/);
  const publishedRoute = readFileSync("app/published/[id]/route.ts", "utf8");
  assert.match(publishedRoute, /style-src 'unsafe-inline' https:\/\/fonts\.googleapis\.com https:\/\/api\.fontshare\.com/);
  assert.match(publishedRoute, /font-src https:/);
  console.log("[proof] document export (ZIP/publish) carries font links; CSP allows them");
}

function fontCdnReachable(): boolean {
  try {
    const status = execFileSync(
      "curl",
      ["-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "10", googleFontHref(SERIF_DISPLAY)],
      { encoding: "utf8" },
    );
    return status.trim() === "200";
  } catch {
    return false;
  }
}

function ensureLocalChromium() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return;
  const playwrightChrome = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  if (existsSync(playwrightChrome)) process.env.PUPPETEER_EXECUTABLE_PATH = playwrightChrome;
}

async function checkScreenshotFonts() {
  if (process.env.STUDIO_OS_DISABLE_SCREENSHOT === "true") {
    console.log("[proof] SKIP screenshot font check (STUDIO_OS_DISABLE_SCREENSHOT=true)");
    return;
  }
  if (!fontCdnReachable()) {
    console.log("[proof] SKIP screenshot font check (Google Fonts unreachable from this machine)");
    return;
  }
  ensureLocalChromium();

  // Desktop artboard width, as threaded from the visual refine loop.
  const result = await renderDesignNodeScreenshot(sampleTree, { width: 1440 });
  if (!result) {
    console.log("[proof] SKIP screenshot font check (no Chromium available)");
    return;
  }
  assert.match(result.dataUrl, /^data:image\/png;base64,/);
  const serif = result.fonts.find((f) => f.family === SERIF_DISPLAY);
  assert.ok(serif, "screenshot reports the serif display font");
  assert.equal(serif.loaded, true, `${SERIF_DISPLAY} must pass document.fonts.check in the screenshot page`);
  console.log("[proof] screenshot page fonts:", result.fonts.map((f) => `${f.family}=${f.loaded}`).join(", "));
}

async function main() {
  checkCollection();
  checkExports();
  await checkScreenshotFonts();
  console.log("render-fonts proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
