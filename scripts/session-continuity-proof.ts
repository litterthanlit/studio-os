/**
 * Proof gate — coding-agent session continuity lives in-repo.
 *
 * The next agent must be able to start from SESSION.md without rediscovering
 * architecture from extensions/cursor/. This gate fails when that contract drifts.
 *
 * Run: npm run proof:session-continuity
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_HEADINGS = [
  "Last updated",
  "Resume point",
  "Product",
  "Invariants",
  "Where to read (in order)",
  "Architecture",
  "Canonical paths",
  "Plugin vs coding agents",
  "Proof",
  "How to update this file",
] as const;

const REQUIRED_PHRASES = [
  "Read this file first",
  "Do not start from `extensions/cursor/`",
  "Convex is truth",
  "Do not rebuild PageNode",
  "Do not invent canvas / digest / attn",
  "npm run proof:session-continuity",
] as const;

function readRepoFile(relPath: string): string {
  const abs = path.join(ROOT, relPath);
  assert.ok(existsSync(abs), `missing file: ${relPath}`);
  return readFileSync(abs, "utf8");
}

function markdownHeadings(md: string): string[] {
  return md
    .split(/\r?\n/)
    .filter((line) => /^##\s+\S/.test(line))
    .map((line) => line.replace(/^##\s+/, "").trim());
}

function sectionBody(md: string, heading: string): string {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  assert.notEqual(start, -1, `SESSION.md missing heading: ## ${heading}`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+\S/.test(lines[i] ?? "")) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

function canonicalPaths(md: string): string[] {
  const body = sectionBody(md, "Canonical paths");
  const paths = [...body.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value))
    .filter((value) => value.endsWith(".md") || value.endsWith(".ts") || value.endsWith(".tsx") || value.endsWith(".json"));
  return [...new Set(paths)];
}

function testSessionFileShape() {
  const session = readRepoFile("SESSION.md");
  const headings = markdownHeadings(session);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(headings.includes(heading), `SESSION.md missing ## ${heading}`);
  }

  for (const phrase of REQUIRED_PHRASES) {
    assert.ok(session.includes(phrase), `SESSION.md missing required phrase: ${phrase}`);
  }

  const lastUpdated = sectionBody(session, "Last updated").trim();
  assert.match(lastUpdated, /20\d{2}-\d{2}-\d{2}/, "Last updated must include a YYYY-MM-DD date");

  const resume = sectionBody(session, "Resume point").trim();
  assert.ok(resume.length >= 80, "Resume point is too short to be useful to the next agent");
}

function testCanonicalPathsExist() {
  const session = readRepoFile("SESSION.md");
  const paths = canonicalPaths(session);
  assert.ok(paths.length >= 10, `expected >= 10 canonical paths, got ${paths.length}`);
  assert.ok(paths.includes("SESSION.md"), "canonical paths must include SESSION.md");
  assert.ok(paths.includes("CLAUDE.md"), "canonical paths must include CLAUDE.md");
  assert.ok(paths.includes("lib/canvas/design-node.ts"), "canonical paths must include DesignNode");
  assert.ok(paths.includes("convex/schema.ts"), "canonical paths must include Convex schema");

  for (const relPath of paths) {
    assert.ok(existsSync(path.join(ROOT, relPath)), `canonical path does not exist: ${relPath}`);
  }
}

function testEntryDocsPointHere() {
  const sessionMentions = [
    ["README.md", "SESSION.md"],
    ["CLAUDE.md", "SESSION.md"],
    ["AGENTS.md", "SESSION.md"],
    ["extensions/cursor/README.md", "SESSION.md"],
  ] as const;

  for (const [relPath, needle] of sessionMentions) {
    const text = readRepoFile(relPath);
    assert.ok(text.includes(needle), `${relPath} must point agents at ${needle}`);
  }

  const agents = readRepoFile("AGENTS.md");
  assert.ok(
    !agents.includes("HANDOFF-CHECKPOINT.md"),
    "AGENTS.md still requires HANDOFF-CHECKPOINT.md — that file does not exist; SESSION.md is the resume"
  );
  assert.ok(
    !agents.includes("studio-os/CLAUDE.md"),
    "AGENTS.md still uses nested studio-os/CLAUDE.md path; CLAUDE.md is at repo root"
  );
  assert.ok(
    agents.includes("read `SESSION.md` first") || agents.includes("Read `SESSION.md` first") || agents.includes("**SESSION.md**"),
    "AGENTS.md must tell agents to read SESSION.md first"
  );

  const readme = readRepoFile("README.md");
  const agentsSection = readme.split("## For AI Agents")[1] ?? "";
  const sessionIdx = agentsSection.indexOf("SESSION.md");
  const claudeIdx = agentsSection.indexOf("CLAUDE.md");
  const pluginIdx = agentsSection.indexOf("extensions/cursor");
  assert.ok(sessionIdx !== -1 && claudeIdx !== -1, "README For AI Agents must list SESSION.md and CLAUDE.md");
  assert.ok(sessionIdx < claudeIdx, "README must list SESSION.md before CLAUDE.md");
  assert.ok(pluginIdx !== -1, "README For AI Agents must say not to start from extensions/cursor");
}

function testPluginIsNotArchitectureSource() {
  const pluginReadme = readRepoFile("extensions/cursor/README.md");
  assert.ok(
    pluginReadme.includes("SESSION.md"),
    "plugin README must send coding agents to SESSION.md"
  );
  assert.ok(
    pluginReadme.includes("live") || pluginReadme.includes("MCP"),
    "plugin README should still describe the live MCP"
  );

  const skill = readRepoFile("extensions/cursor/skills/studio-canvas/SKILL.md");
  assert.ok(
    skill.includes("studio-os.io/api/mcp"),
    "plugin skill is MCP canvas editing — keep that, do not turn it into the repo architecture guide"
  );
  assert.ok(
    skill.includes("SESSION.md"),
    "plugin skill must send coding agents to SESSION.md instead of becoming the architecture guide"
  );
}

function testProductInvariantsStillHold() {
  const designNode = readRepoFile("lib/canvas/design-node.ts");
  assert.ok(designNode.includes('"frame"'), "DesignNode types missing frame");
  assert.ok(designNode.includes('"text"'), "DesignNode types missing text");
  assert.ok(designNode.includes('"image"'), "DesignNode types missing image");
  assert.ok(designNode.includes('"button"'), "DesignNode types missing button");
  assert.ok(designNode.includes('"divider"'), "DesignNode types missing divider");

  const schema = readRepoFile("convex/schema.ts");
  assert.ok(schema.includes("canvasDocuments"), "Convex schema missing canvasDocuments");

  const projects = readRepoFile("convex/projects.ts");
  assert.ok(projects.includes("loadCanvas"), "convex/projects.ts missing loadCanvas");
  assert.ok(projects.includes("saveCanvas"), "convex/projects.ts missing saveCanvas");
}

function main() {
  testSessionFileShape();
  testCanonicalPathsExist();
  testEntryDocsPointHere();
  testPluginIsNotArchitectureSource();
  testProductInvariantsStillHold();
  console.log("proof:session-continuity passed (5/5)");
}

main();
