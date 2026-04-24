import fs from "node:fs";
import path from "node:path";

type Check = {
  name: string;
  file: string;
  patterns: string[];
};

const ROOT = process.cwd();

const checks: Check[] = [
  {
    name: "Drag starts from any design node and selects unselected nodes",
    file: "app/canvas-v1/hooks/useDragDesignNode.ts",
    patterns: [
      "querySelectorAll<HTMLElement>(\"[data-node-id]\")",
      "onSelectNodeRef.current?.(targetId)",
      "DRAG_THRESHOLD_PX",
    ],
  },
  {
    name: "Flow-node drag has no hidden hold delay",
    file: "app/canvas-v1/hooks/useDragDesignNode.ts",
    patterns: ["const DRAG_THRESHOLD_PX = 4"],
  },
  {
    name: "Resize handles have hit targets and pointer capture",
    file: "app/canvas-v1/components/DesignNodeResizeHandles.tsx",
    patterns: [
      "const HIT_TARGET_SIZE = 18",
      "setPointerCapture",
      "data-resize-handle",
      "getBreakoutOrigin",
    ],
  },
  {
    name: "Canvas ignores pointer handling during active resize",
    file: "app/canvas-v1/components/ComposeDocumentViewV6.tsx",
    patterns: [
      "if ((e.target as HTMLElement).closest(\"[data-resize-handle]\")) return",
      "if (isResizing)",
      "onResizeStart={() => setIsResizing(true)}",
      "onResizeDone={() => setIsResizing(false)}",
    ],
  },
  {
    name: "Text layers select on click and edit on double-click",
    file: "app/canvas-v1/components/ComposeDocumentViewV6.tsx",
    patterns: [
      "onSelect(node.id)",
      "onDoubleClick",
      "Double-click to edit",
    ],
  },
  {
    name: "Layers auto-expand against resolved component trees",
    file: "app/canvas-v1/components/LayersPanelV3.tsx",
    patterns: [
      "const activeLayerTree = React.useMemo",
      "resolveTree(activeItem.pageTree as DesignNode, components)",
      "getAncestors(selectedNodeId, activeLayerTree)",
    ],
  },
  {
    name: "Export has preflight gating before publish",
    file: "app/canvas-v1/components/inspector/ExportTab.tsx",
    patterns: [
      "runExportPreflight",
      "Publish preflight",
      "!preflight.ready",
    ],
  },
  {
    name: "Taste card exposes a visible taste brief",
    file: "app/canvas-v1/components/TasteCard.tsx",
    patterns: [
      "Taste brief",
      "referenceCount",
      "TasteBriefTrait",
    ],
  },
];

let failures = 0;

for (const check of checks) {
  const filePath = path.join(ROOT, check.file);
  const source = fs.readFileSync(filePath, "utf8");
  const missing = check.patterns.filter((pattern) => !source.includes(pattern));

  if (missing.length > 0) {
    failures += 1;
    console.error(`✗ ${check.name}`);
    console.error(`  ${check.file}`);
    for (const pattern of missing) {
      console.error(`  missing: ${pattern}`);
    }
  } else {
    console.log(`✓ ${check.name}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} canvas trust smoke ${failures === 1 ? "check" : "checks"} failed.`);
  process.exit(1);
}

console.log("\nCanvas trust smoke checks passed.");
