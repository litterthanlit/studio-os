# Track 7 Handoff Prompt — For the Next COO

**From:** Previous COO (Track 6 ship)  
**To:** Next COO (Track 7 planning)  
**Date:** 2026-04-07  
**Context:** Editor Maturity Track 7 — Undefined / CEO Decision Required  

---

## Current State (As of Track 6 Ship)

### Editor Maturity Progress

| Track | Status | Date |
|-------|--------|------|
| 1A — Canvas Feel | ✅ Shipped | 2026-04-03 |
| 1B — Selection & Manipulation | ✅ Shipped | 2026-04-03 |
| 2 — Layout Semantics | ✅ Shipped | 2026-04-04 |
| 3 — True Reusable Components | ✅ Shipped | 2026-04-07 |
| 4 — Direct Nested Selection | ✅ Shipped | 2026-04-07 |
| 5 — Richer Text Editing | ✅ Shipped | 2026-04-07 |
| 6 — Reparenting / Tree Surgery | ✅ Shipped | 2026-04-07 |
| **7 — TBD** | 📋 **Next** | — |
| 8+ — Future | 📋 Future | — |

### What We Just Shipped (Track 6)

**Files changed:** 3 files, ~483 lines  
**Commits:** 4 sequential commits (b149521 → 9ea9d9a)

**New infrastructure:**
- `lib/canvas/canvas-reducer.ts` — `REPARENT_NODE` action with cycle detection, validation, history integration
- `app/canvas-v1/hooks/useLayersDragReorder.ts` — Cross-parent drag with three-zone hit-testing
- `app/canvas-v1/components/LayersPanelV3.tsx` — Drop visualization (parent highlight, red ×, insertion line), auto-scroll

**Capabilities now live:**
- Drag any non-instance node to a new parent in layers panel
- Three-zone drop targeting: top (before sibling), middle (drop as child), bottom (after sibling)
- Parent highlight (#D1E4FC/20 + blue border) when hovering valid frame/group middle zone
- Red × indicator when hovering invalid target (text/image/button/divider)
- Auto-scroll when dragging near panel edges
- Escape key cancels drag operation
- All reparent operations undoable
- Component instance children cannot be reparented (structural guard)

**Scope decisions made:**
- Layers-first (not canvas-first) — canvas reparenting is future work
- Same-artboard only — cross-artboard reparenting out of scope
- Root-level drop valid — can pull nested elements to top-level
- Frame/group only as parents — text/image/button/divider cannot accept children

---

## Track 7: The Open Question

### The Context

With Track 6 complete, the Editor Maturity tracks have covered:
- **Canvas feel** (cursor states, zoom/pan, measurement guides)
- **Selection & manipulation** (multi-select, align/distribute, group/ungroup, z-order)
- **Layout semantics** (Fill/Hug/Fixed sizing model)
- **Reusable components** (master/instance model, overrides, gallery)
- **Direct nested selection** (Cmd+Click cycling, hover preview, keyboard nav)
- **Richer text editing** (hover affordances, inline toolbar, formatting shortcuts)
- **Tree surgery** (reparenting, cross-parent moves)

### Potential Track 7 Directions

| Direction | Description | Complexity | Value |
|-----------|-------------|------------|-------|
| **A. Advanced Multi-Edit** | Multi-select reparent, bulk operations, selection memory | High | Power user feature |
| **B. Canvas-Level Reparent** | Drag on canvas to reparent (hit-testing frames under cursor) | High | Visual/intuitive |
| **C. Copy/Paste** | Copy nodes between artboards, paste with smart positioning | Medium | Essential workflow |
| **D. Responsive Editing** | Edit mobile breakpoint while viewing desktop, sync logic | High | Core design tool |
| **E. Asset Pipeline** | Image upload, optimization, CDN integration | Medium | Production readiness |
| **F. Collaboration** | Real-time cursors, comments, presence | Very High | Team features |
| **G. Polish & Performance** | Animation cleanup, render optimization, bug fixes | Low-Medium | Quality |

### CEO Decision Required

**The next COO should NOT start Track 7 planning until the CEO decides:**
1. Which direction (A-G or other) is highest leverage?
2. Is the editor "mature enough" for debut, or are there critical gaps?
3. Should effort shift from Editor Maturity to other areas (AI quality, onboarding, marketing)?

---

## Technical Debt & Cleanup Opportunities

### Known Issues (Not Blocking)
- Pre-existing TypeScript errors (~10) in unrelated files (project-room.tsx, arena route, etc.)
- No automated test coverage for drag interactions
- Component instance child copy/paste not implemented

### Architectural Strengths
- Reducer pattern scales well (30+ actions, clean separation)
- Tree operations are immutable and testable
- History integration is automatic for all structural changes

---

## Recommended COO Opening

1. **Read this handoff** — You're here
2. **Review AGENTS.md** — Confirm current state
3. **Play with the product** — Test reparenting in the layers panel
4. **Wait for CEO direction** — Do not spec Track 7 without CEO input
5. **If CEO says "what's next":** Run the "what's the move" routine (CEO role)

---

## From the Previous COO

Track 6 went smoothly. Sequential task execution (1→2→3→4) prevented interface mismatches. Key lessons:

- **Proof gates matter** — 25 specific assertions caught 2 integration issues before they shipped
- **Interaction spec must be detailed** — Three-zone hit-testing (top/middle/bottom) would have been guessed wrong by agents without explicit percentages
- **Scope boundaries need explicit decisions** — Cross-artboard reparenting, canvas reparenting, multi-select reparent — all deferred with clear "out of scope" labels

The foundation is solid. The editor now has Figma-level tree manipulation in the layers panel. Canvas-level reparenting and other advanced features await CEO direction.

---

## Quick Reference: Track 6 Implementation

```typescript
// Three-zone hit-testing (from useLayersDragReorder.ts)
const rect = rowEl.getBoundingClientRect();
const relativeY = e.clientY - rect.top;
const zoneHeight = rect.height;

if (relativeY < zoneHeight * 0.32) {
  // TOP: drop before this node (same parent)
  targetIndex = rowIndex;
} else if (relativeY < zoneHeight * 0.68) {
  // MIDDLE: drop as child of this node
  targetParentId = rowNodeId;
  targetIndex = 0;
} else {
  // BOTTOM: drop after this node (same parent)
  targetIndex = rowIndex + 1;
}
```

---

## Resources

- **Track 6 Handoff:** `docs/superpowers/plans/2026-04-07-track6-handoff-prompt.md`
- **AGENTS.md:** `/Users/niki_g/Local Files/workflow/Projects/studio OS/AGENTS.md`
- **CLAUDE.md:** `studio-os/CLAUDE.md`
- **Editor Maturity Tracks Spec:** `docs/superpowers/specs/2026-04-04-editor-maturity-tracks.md`

---

## Success Criteria (For Next COO)

- [ ] CEO direction received on Track 7 scope
- [ ] Implementation plan written with proof gate assertions
- [ ] Task breakdown with explicit dependencies (sequential vs parallel)
- [ ] Agents deployed and work completed
- [ ] Documentation updated (AGENTS.md, handoff for Track 8)
