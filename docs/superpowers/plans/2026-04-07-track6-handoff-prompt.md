# Track 6 Handoff Prompt — For the Next COO

**From:** Previous COO (Track 5 ship)  
**To:** Next COO (Track 6 planning)  
**Date:** 2026-04-07  
**Context:** Editor Maturity Track 6 — Reparenting / Tree Surgery  

---

## Current State (As of Track 5 Ship)

### Editor Maturity Progress

| Track | Status | Date |
|-------|--------|------|
| 1A — Canvas Feel | ✅ Shipped | 2026-04-03 |
| 1B — Selection & Manipulation | ✅ Shipped | 2026-04-03 |
| 2 — Layout Semantics | ✅ Shipped | 2026-04-04 |
| 3 — True Reusable Components | ✅ Shipped | 2026-04-07 |
| 4 — Direct Nested Selection | ✅ Shipped | 2026-04-07 |
| 5 — Richer Text Editing | ✅ Shipped | 2026-04-07 |
| **6 — Reparenting / Tree Surgery** | 📋 **Next** | — |
| 7+ — Advanced Multi-Edit | 📋 Future | — |

### What We Just Shipped (Track 5)

**Files changed:** 4 files, ~450 lines  
**New infrastructure:**
- `app/canvas-v1/components/TextInlineToolbar.tsx` — Inline floating toolbar for text nodes
- Enhanced `TextContent` component with hover affordances, selection color, triple-click

**Capabilities now live:**
- Hover tooltips: "Click to edit" (selected) / "Double-click to edit" (unselected)
- Single-click enters edit mode if text already selected (Figma pattern)
- Custom selection color (#D1E4FC) via scoped ::selection CSS
- Triple-click selects all text in node
- Cmd+A in edit mode selects all text (not layer)
- Cmd+B/I/U formatting shortcuts
- Inline toolbar with Bold, Italic, Font Size (12-72)
- Toolbar positions above/flips below, dismiss on Escape/click-away/edit-mode

---

## Track 6: Reparenting / Tree Surgery — The Brief

### The Problem

Right now, tree operations are limited:
- Can reorder siblings (drag in layers panel)
- Can delete nodes
- **Cannot** move a node from one parent to another
- **Cannot** drag a node out of a frame onto the canvas root
- **Cannot** drag a node from canvas root into a frame
- **Cannot** visually reparent via drag on canvas

This is a ceiling on real design workflows. Eventually users need to restructure — move a button from one card to another, pull an element out of a group, reorganize sections.

### The Goal

Enable drag-to-reparent operations that feel trustworthy. The user should be able to:
1. Drag a node from one parent to another
2. See clear visual feedback during drag (where will this land?)
3. Understand the hierarchy change that's about to happen
4. Undo if they make a mistake

Target: Figma-level reparenting confidence. Not Webflow's modal approach. Not Sketch's discontinuous jumps.

### Likely Scope (Draft — You Decide)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Drag-to-reparent in layers panel** | Drag node in layers tree to new parent | Medium |
| **Canvas drag with reparent zones** | Drag node on canvas, highlight valid drop targets | High |
| **Visual drop indicators** | Line between siblings, highlight parent on hover | Medium |
| **Escape-to-cancel** | Press Escape during drag to cancel | Low |
| **Smart insertion index** | Drop between siblings at visual position | Medium |
| **Undo support** | All reparent operations push history | Low |

### Key Decisions You Need to Make

**1. Canvas vs Layers-First**
- **Option A:** Start with layers panel drag (simpler, clear hierarchy visualization)
- **Option B:** Start with canvas drag (more direct, but needs hit-testing)
- **Option C:** Both in parallel (more work, unified feel)
- **Recommendation:** Option A. The layers panel is the authority on tree structure. Get that right first, then extend to canvas.

**2. Drop Target Visualization**
- **Option A:** Highlight entire parent on hover (simple)
- **Option B:** Show insertion line between specific siblings (precise)
- **Option C:** Both (parent highlight + insertion line)
- **Recommendation:** Option B. Users need to know exactly where the node will land.

**3. Auto-Scroll During Drag**
- **Option A:** Scroll layers panel when dragging near edges
- **Option B:** No auto-scroll (user scrolls manually)
- **Recommendation:** Option A. Standard pattern, prevents "can't reach target" frustration.

**4. Valid Drop Targets**
- Can drop into any frame?
- Can drop into text nodes? (probably no)
- Can drop into image nodes? (probably no)
- Can drop before/after any sibling?
- **Recommendation:** Frames and groups only as parents. Any node type can be a child. Sibling insertion anywhere.

### Files You'll Touch

| File | Current Role | Likely Changes |
|------|--------------|----------------|
| `LayersPanelV3.tsx` | Tree navigator | Drag-to-reparent handlers |
| `useLayersDragReorder.ts` | Reorder hook | Extend to support reparenting |
| `canvas-reducer.ts` | State mutations | New REPARENT_NODE action |
| `design-node.ts` | Type definitions | No changes needed |
| `ComposeDocumentViewV6.tsx` | Canvas renderer | Future: canvas drag reparenting |

### Precedent to Study

**Figma reparenting:**
- Layers panel: drag to reorder, drag to reparent
- Blue line between siblings shows drop position
- Parent highlights when dragging over it
- Auto-scroll when near panel edges
- Escape cancels

**Framer:**
- Similar to Figma but more constrained
- Simpler visual feedback (good reference for minimal approach)

**What to avoid:**
- Webflow's "move to" modal (breaks flow)
- Sketch's separate "group" vs "move" operations (too many modes)
- After Effects' parenting pick-whip (overkill for this stage)

### Suggested First Steps

**Task 0: Investigation (You do this)**
- Audit current layers panel drag implementation (`useLayersDragReorder.ts`)
- Understand how reordering works today (same-parent reorder only)
- Document the gap between reorder and reparent

**Task 1: Reducer Foundation**
- Add `REPARENT_NODE` action to canvas-reducer.ts
- Action needs: nodeId, sourceParentId, targetParentId, targetIndex
- Handle the tree surgery (immutable update)

**Task 2: Layers Panel Drop Zones**
- Extend layers panel to show drop indicators between any siblings
- Not just within same parent — across entire tree
- Calculate valid drop targets during drag

**Task 3: Auto-Scroll**
- Add edge detection during drag in layers panel
- Smooth scroll when dragging near top/bottom

**Task 4: Visual Polish**
- Blue insertion line (1.5px #4B57DB)
- Parent highlight on hover (#D1E4FC/20 background)
- Drop zone validation (red X if invalid target)

---

## Open Questions

1. **Should we support multi-select reparent?**
   - Pro: Powerful for moving groups of elements
   - Con: Complex to visualize, edge cases with mixed parents
   - Recommendation: Start single-node, add multi-select later

2. **What about canvas-level reparenting?**
   - Drag on canvas, drop into visible frames
   - Requires hit-testing during drag
   - Recommendation: Phase 2 after layers panel is solid

3. **How do we handle component instances?**
   - Can you reparent children of a component instance?
   - Probably no — instances should be locked
   - Recommendation: Disable reparent for instance children

4. **Should there be a keyboard shortcut?**
   - Cut/paste as reparent?
   - Cmd+X, Cmd+V with selection?
   - Recommendation: Future, not core to this track

---

## Success Criteria (Draft)

Track 6 is complete when:

- [ ] Can drag any node to a new parent in layers panel
- [ ] Visual drop indicator shows exact insertion position
- [ ] Invalid drop targets rejected visually
- [ ] Auto-scroll works when dragging near panel edges
- [ ] Escape key cancels drag operation
- [ ] All reparent operations are undoable
- [ ] Component instance children cannot be reparented
- [ ] Build passes, no regressions in layers panel

---

## Resources

- **Track 5 Spec:** `docs/superpowers/specs/2026-04-07-track5-richer-text-editing.md` (if exists)
- **Track 4 Plan:** `docs/superpowers/plans/2026-04-07-track4-direct-nested-selection.md`
- **Editor Maturity Tracks:** `docs/superpowers/specs/2026-04-04-editor-maturity-tracks.md`
- **CLAUDE.md:** `studio-os/CLAUDE.md` — codebase guide
- **Current layers drag:** `app/canvas-v1/hooks/useLayersDragReorder.ts`

---

## Recommended COO Opening

1. **Read this handoff** — You're here
2. **Read CLAUDE.md** — Understand codebase structure
3. **Play with current layers panel** — Drag reorder, feel the constraints
4. **Read `useLayersDragReorder.ts`** — Understand current implementation
5. **Decide on scope** — What's in/out for Track 6
6. **Write the spec** — User flows, UI design, edge cases
7. **Write the plan** — Task breakdown, estimates
8. **Deploy agents** — Execute

---

## From the Previous COO

Track 5 went smoothly. The 4-task structure worked well. Key lessons:

- **Parallel toolbar + shortcuts worked** — Two entry points for same operations
- **Visual polish matters** — 15ms animation, hover states, selection color
- **Edit mode guards are critical** — Shortcuts must not fire when contentEditable active
- **~450 lines is right-sized** — For a 1-2 session track

Track 6 is more complex than Track 5. Tree surgery has more edge cases (cycles, invalid targets, component instances). Take time on the spec — get Nick's input on canvas vs layers-first, drop visualization, and component instance handling.

The foundation is solid. Make the right calls.

---

## Quick Reference: Current Layers Drag Implementation

```typescript
// useLayersDragReorder.ts — current behavior
// - Only allows reorder within same parent
// - 150ms hold-to-drag
// - Shows insertion line between siblings
// - Commits on drop

// What needs to change for reparenting:
// - Allow dragging to different parent
// - Calculate valid drop zones across entire tree
// - Show parent highlight + insertion line
// - Handle the actual tree surgery in reducer
```
