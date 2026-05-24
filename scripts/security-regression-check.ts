import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function source(filePath: string): string {
  return readFileSync(path.join(root, filePath), "utf8");
}

const checks: Array<[string, () => void]> = [
  [
    "canvas compose requires auth, size limit, and durable rate limit",
    () => {
      const src = source("app/api/canvas/compose/route.ts");
      assert.match(src, /readGuardedJson/);
      assert.match(src, /requireAuth:\s*true/);
      assert.match(src, /maxBytes:\s*API_LIMITS\.aiRequestBytes/);
      assert.match(src, /namespace:\s*"canvas-compose"/);
      assert.doesNotMatch(src, /await\s+req\.json\(\)/);
    },
  ],
  [
    "Are.na channel list requires request auth before using the server token",
    () => {
      const src = source("app/api/arena/route.ts");
      assert.match(src, /guardRequest/);
      assert.match(src, /requireAuth:\s*true/);
      assert.match(src, /namespace:\s*"arena"/);
      assert.match(src, /GET\(req:\s*NextRequest\)/);
    },
  ],
  [
    "Are.na channel contents requires request auth before using the server token",
    () => {
      const src = source("app/api/arena/[channelSlug]/route.ts");
      assert.match(src, /guardRequest/);
      assert.match(src, /requireAuth:\s*true/);
      assert.match(src, /namespace:\s*"arena-channel"/);
      assert.match(src, /GET\(\s*req:\s*NextRequest,/);
    },
  ],
  [
    "Lummi search requires request auth before using the server token",
    () => {
      const src = source("app/api/lummi/route.ts");
      assert.match(src, /guardRequest/);
      assert.match(src, /requireAuth:\s*true/);
      assert.match(src, /namespace:\s*"lummi"/);
      assert.match(src, /GET\(req:\s*NextRequest\)/);
    },
  ],
  [
    "waitlist mutation is protected by the internal service secret",
    () => {
      const waitlist = source("convex/waitlist.ts");
      const nextRoute = source("app/api/waitlist/route.ts");
      const convexHttp = source("convex/http.ts");
      assert.match(waitlist, /serviceSecret:\s*v\.string\(\)/);
      assert.match(waitlist, /assertServiceSecret\(args\.serviceSecret\)/);
      assert.match(nextRoute, /serviceSecret/);
      assert.match(convexHttp, /serviceSecret/);
    },
  ],
  [
    "published exports use CSP sandboxing and block scripts",
    () => {
      const src = source("app/published/[id]/route.ts");
      assert.match(src, /Content-Security-Policy/);
      assert.match(src, /sandbox/);
      assert.match(src, /script-src 'none'/);
    },
  ],
  [
    "generated preview iframes do not combine scripts with same-origin",
    () => {
      for (const filePath of [
        "app/canvas-v1/components/ComponentPreview.tsx",
        "app/canvas-v1/canvas-client.tsx",
        "app/canvas-v1/components/CollectView.tsx",
      ]) {
        assert.doesNotMatch(source(filePath), /allow-scripts allow-same-origin/);
      }
    },
  ],
];

for (const [name, check] of checks) {
  check();
  console.log(`ok - ${name}`);
}
