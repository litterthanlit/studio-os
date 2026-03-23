// app/(dashboard)/test-v6/page.tsx
// Visual proof gate for the V6 renderer.
// Renders a hand-authored DesignNode editorial homepage.
// Compare this against the current PageNode renderer output to decide go/no-go.

"use client";

import { ComposeDocumentViewV6 } from "@/app/canvas-v1/components/ComposeDocumentViewV6";
import { EDITORIAL_TEST_TREE } from "@/lib/canvas/test-editorial-tree";

export default function TestV6Page() {
  return (
    <div style={{
      maxWidth: 1440,
      margin: "0 auto",
      background: "#FAF9F6",
      minHeight: "100vh",
    }}>
      <div style={{
        position: "fixed",
        top: 16,
        right: 16,
        background: "#1A1A1A",
        color: "#FFFFFF",
        padding: "8px 16px",
        borderRadius: 4,
        fontSize: 12,
        fontFamily: "monospace",
        zIndex: 9999,
      }}>
        V6 RENDERER PROOF — Phase 1a
      </div>
      <ComposeDocumentViewV6 tree={EDITORIAL_TEST_TREE} />
    </div>
  );
}
