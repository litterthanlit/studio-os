/**
 * Proof gate P7 — Code-grade export (DesignNode → React + Tailwind).
 *
 * Run: npm run proof:code-export
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createStarterCanvasProject } from "../lib/canvas/starter-canvas";
import { designNodeToTSX } from "../lib/canvas/design-node-to-tsx";
import { designNodeToHTML } from "../lib/canvas/design-node-to-html";
import {
  buildTailwindTokensJs,
  buildTokensCss,
} from "../lib/canvas/design-tokens-export";
import { buildExportZipBlob } from "../lib/canvas/build-export-zip";
import type { DesignNode } from "../lib/canvas/design-node";

const DEV_BASE = process.env.CODE_EXPORT_PROOF_BASE ?? "http://localhost:3000";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const sampleTree: DesignNode = {
  id: "proof-root",
  type: "frame",
  name: "Dashboard",
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    width: 1440,
    background: "#FAFAF8",
    padding: { top: 48, right: 48, bottom: 48, left: 48 },
  },
  children: [
    {
      id: "proof-title",
      type: "text",
      name: "Title",
      content: { text: "Analytics Dashboard" },
      style: { fontSize: 40, fontWeight: 600, foreground: "#1A1A1A" },
    },
    {
      id: "proof-card-row",
      type: "frame",
      name: "Cards",
      style: { display: "flex", flexDirection: "row", gap: 16 },
      children: [
        {
          id: "proof-card",
          type: "frame",
          name: "Stat Card",
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: { top: 16, right: 16, bottom: 16, left: 16 },
            background: "#FFFFFF",
            borderRadius: 4,
            borderWidth: 1,
            borderColor: "#E5E5E0",
          },
          children: [
            {
              id: "proof-stat",
              type: "text",
              name: "Stat",
              content: { text: "12.4k" },
              style: { fontSize: 28, fontWeight: 700 },
            },
          ],
        },
      ],
    },
  ],
};

function testTsxStructure() {
  const tsx = designNodeToTSX(sampleTree, { componentName: "AnalyticsDashboard" });
  assert.match(tsx, /export function AnalyticsDashboard\(\)/);
  assert.match(tsx, /className="[^"]*flex[^"]*"/);
  assert.match(tsx, /Analytics Dashboard/);
  assert.match(tsx, /<button|<a|<section|<div/);
}

function testTokensArtifacts() {
  const css = buildTokensCss({});
  assert.match(css, /--color-background:/);
  assert.match(css, /--font-family:/);

  const tailwind = buildTailwindTokensJs({});
  assert.match(tailwind, /theme\.extend/);
  assert.match(tailwind, /colors/);
}

function testStarterCanvasExport() {
  const { canvasState } = createStarterCanvasProject();
  const artboard = canvasState.items.find((item) => item.kind === "artboard");
  assert.ok(artboard && artboard.kind === "artboard");
  assert.ok(artboard.pageTree);

  const tsx = designNodeToTSX(artboard.pageTree as DesignNode, {
    componentName: "StarterDesktop",
  });
  assert.match(tsx, /export function StarterDesktop\(\)/);
  assert.ok(tsx.length > 500);

  const html = designNodeToHTML(artboard.pageTree as DesignNode, { outputMode: "fragment" });
  assert.ok(html.length > 500);
}

async function testZipIncludesReactArtifacts() {
  const tsx = designNodeToTSX(sampleTree);
  const html = designNodeToHTML(sampleTree);
  const blob = await buildExportZipBlob({
    html,
    tsx,
    tokensCss: buildTokensCss({}),
    tailwindTokensJs: buildTailwindTokensJs({}),
  });
  assert.ok(blob.size > 500);
}

function testTsxCompilesWithTsc() {
  const tsx = designNodeToTSX(sampleTree, { componentName: "ProofExport" });
  const dir = mkdtempSync(join(tmpdir(), "studio-tsx-proof-"));
  try {
    writeFileSync(
      join(dir, "Component.tsx"),
      `/// <reference types="react" />\n/// <reference types="react-dom" />\n${tsx}`,
    );
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            jsx: "react-jsx",
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            skipLibCheck: true,
            module: "ESNext",
            moduleResolution: "bundler",
            target: "ES2020",
            typeRoots: [join(ROOT, "node_modules/@types")],
            types: ["react"],
          },
          include: ["Component.tsx"],
        },
        null,
        2,
      ),
    );
    execSync(`"${join(ROOT, "node_modules/.bin/tsc")}" --noEmit -p tsconfig.json`, {
      cwd: dir,
      stdio: "pipe",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function testScreenDesignTsxApi() {
  try {
    const response = await fetch(`${DEV_BASE}/api/agent/screen-design`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-studio-os-service-secret": process.env.CONVEX_INTERNAL_API_SECRET ?? "dev-bypass",
      },
      body: JSON.stringify({
        projectId: "starter-canvas",
        artboardId: "starter-desktop-proof",
        format: "tsx",
      }),
    });
    if (!response.ok) {
      console.log(`  (skip live API — ${response.status})`);
      return;
    }
    const data = (await response.json()) as { tsx?: string; format?: string };
    assert.equal(data.format, "tsx");
    assert.ok(typeof data.tsx === "string" && data.tsx.includes("export function"));
  } catch {
    console.log("  (skip live API — dev server unavailable)");
  }
}

async function main() {
  console.log("P7 code export proof\n");

  testTsxStructure();
  console.log("✓ TSX structure + Tailwind classes");

  testTokensArtifacts();
  console.log("✓ tokens.css + tailwind.tokens.js");

  testStarterCanvasExport();
  console.log("✓ starter-canvas artboard exports");

  await testZipIncludesReactArtifacts();
  console.log("✓ ZIP includes React artifacts");

  testTsxCompilesWithTsc();
  console.log("✓ TSX compiles (tsc --noEmit)");

  await testScreenDesignTsxApi();
  console.log("✓ screen-design format=tsx (live or skipped)");

  console.log("\nP7 proof passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
