/**
 * Proof gate — Convex Auth + agent-connect path (static + helper checks).
 *
 * Live Google / Resend / upsert still need Convex dashboard secrets.
 * Run: npm run proof:convex-auth-path
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isConvexConfigured, getPublicConvexUrl } from "../lib/convex/is-configured";
import { mergeStudioProjects } from "../lib/studio-projects";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relative: string) {
  return readFileSync(join(root, relative), "utf8");
}

function testConfiguredUrl() {
  const previous = process.env.NEXT_PUBLIC_CONVEX_URL;
  delete process.env.NEXT_PUBLIC_CONVEX_URL;
  assert.equal(getPublicConvexUrl(), null);
  assert.equal(isConvexConfigured(), false);

  process.env.NEXT_PUBLIC_CONVEX_URL = "https://placeholder.convex.cloud";
  assert.equal(getPublicConvexUrl(), null);
  assert.equal(isConvexConfigured(), false);

  process.env.NEXT_PUBLIC_CONVEX_URL = "https://happy-animal-123.convex.cloud";
  assert.equal(getPublicConvexUrl(), "https://happy-animal-123.convex.cloud");
  assert.equal(isConvexConfigured(), true);

  if (previous === undefined) delete process.env.NEXT_PUBLIC_CONVEX_URL;
  else process.env.NEXT_PUBLIC_CONVEX_URL = previous;
}

function testAuthWiring() {
  const authConfig = read("convex/auth.config.ts");
  assert.match(authConfig, /CONVEX_SITE_URL/);
  assert.match(authConfig, /applicationID:\s*"convex"/);

  const auth = read("convex/auth.ts");
  assert.match(auth, /convexAuth\(/);
  assert.match(auth, /Password/);
  assert.match(auth, /Resend/);
  assert.match(auth, /Google/);
  assert.match(auth, /Anonymous/);
  assert.match(auth, /afterUserCreatedOrUpdated/);
  assert.match(auth, /storeCurrent|syncStudioUserRecord/);

  const http = read("convex/http.ts");
  assert.match(http, /auth\.addHttpRoutes\(http\)/);

  const schema = read("convex/schema.ts");
  assert.match(schema, /authTables/);
  assert.match(schema, /\.index\("email"/);

  const provider = read("app/convex-provider.tsx");
  assert.match(provider, /ConvexAuthProvider/);
  assert.match(provider, /getPublicConvexUrl/);
  assert.match(provider, /if \(!convexUrl\)/);
  assert.match(provider, /ConvexProvider/);
  assert.match(provider, /ConvexUserSync/);

  const helpers = read("convex/auth.ts");
  assert.match(helpers, /getCurrentUser/);

  const login = read("app/auth/login/page.tsx");
  assert.doesNotMatch(login, /Convex auth provider is not configured for this deployment yet/);
  assert.match(login, /signIn\("resend"/);
  assert.match(login, /signIn\("password"/);
  assert.match(login, /signIn\("google"/);
}

function testProjectCreateAwaitsConvex() {
  const modal = read("components/new-project-modal.tsx");
  assert.match(modal, /await upsertProject/);
  assert.match(modal, /convexProjectId/);
  assert.match(modal, /Sign in to create a project/);
  assert.doesNotMatch(modal, /Couldn['']t sync to cloud — saved locally/);
  assert.doesNotMatch(modal, /useConvexAuth/);
}

function testAgentUiTruth() {
  const settings = read("app/(dashboard)/settings/AgentConnectionsSection.tsx");
  assert.doesNotMatch(settings, /sos_live_YOUR_TOKEN/);
  assert.match(settings, /Convex project ids/);
  assert.match(settings, /CURSOR_PLUGIN_SOURCE_PATH/);
  assert.match(settings, /STUDIO_OS_API_TOKEN/);
  assert.match(settings, /CURSOR_PLUGIN_LOCAL_PATH/);
  assert.doesNotMatch(settings, /cursor\.com\/marketplace/);
  assert.match(settings, /Generate a token to copy Claude and Codex snippets/);

  const panel = read("app/canvas-v1/components/AgentConnectPanel.tsx");
  assert.match(panel, /Connect Cursor/);
  assert.match(panel, /Sign in to connect Cursor/);
  assert.match(panel, /CURSOR_CONNECT_TOKEN_NAME/);
  assert.match(panel, /CURSOR_PLUGIN_SOURCE_PATH/);
  assert.match(panel, /api\.agentTokens\.create/);
  assert.match(panel, /STUDIO_OS_API_TOKEN/);
  assert.doesNotMatch(panel, /Open Settings to generate a token/);
  assert.doesNotMatch(panel, /this project id/);
  assert.doesNotMatch(panel, /cursor\.com\/marketplace/);
}

function testHomeSidebarNotFake() {
  const home = read("app/(dashboard)/home/home-client.tsx");
  assert.doesNotMatch(home, /Aura Skincare/);
  assert.doesNotMatch(home, /const RECENT_PROJECTS/);
  assert.match(home, /useStudioProjects/);

  const sidebar = read("components/navigation/sidebar.tsx");
  assert.doesNotMatch(sidebar, /acme-rebrand/);
  assert.match(sidebar, /useStudioProjects/);

  const hook = read("hooks/use-studio-projects.ts");
  assert.match(hook, /api\.projects\.listMine/);
  assert.match(hook, /"skip"/);
  assert.doesNotMatch(hook, /useConvexAuth/);
}

function testMergeProjects() {
  const local = [
    {
      id: "local-only",
      name: "Local Draft",
      brief: "",
      color: "#111111",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "synced",
      name: "Synced Local",
      brief: "",
      color: "#4B57DB",
      createdAt: "2026-02-01T00:00:00.000Z",
      convexProjectId: "k17abc",
    },
  ];
  const remote = [
    {
      _id: "k17abc",
      name: "Synced Cloud",
      slug: "synced",
      color: "#4B57DB",
      createdAt: Date.parse("2026-02-01T00:00:00.000Z"),
    },
  ];

  const signedOut = mergeStudioProjects(local, remote, false);
  assert.equal(signedOut.length, 2);
  assert.ok(signedOut.some((item) => item.id === "local-only"));

  const signedIn = mergeStudioProjects(local, remote, true);
  assert.equal(signedIn.length, 1);
  assert.equal(signedIn[0]?.convexProjectId, "k17abc");
  assert.equal(signedIn[0]?.name, "Synced Cloud");
}

function testOnboardingAwaitsConvex() {
  const onboarding = read("app/onboarding/onboarding-client.tsx");
  assert.match(onboarding, /await upsertProject/);
  assert.match(onboarding, /setProjectConvexId/);
  assert.match(onboarding, /storeCurrent/);
  assert.doesNotMatch(onboarding, /useConvexAuth/);
}

function main() {
  testConfiguredUrl();
  testAuthWiring();
  testProjectCreateAwaitsConvex();
  testAgentUiTruth();
  testHomeSidebarNotFake();
  testMergeProjects();
  testOnboardingAwaitsConvex();
  console.log("proof:convex-auth-path passed (7/7)");
}

main();
