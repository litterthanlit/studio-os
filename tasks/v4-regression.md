# V4 Regression Checklist — 2026-03-20

## Automated Checks

- [x] `npx tsc --noEmit` — 34 errors, all pre-existing (documented in CLAUDE.md)
- [x] CSS variable token audit — zero in V2/V3/V4 components (old tokens only in legacy `project-room-page-client.tsx` and `command-palette.tsx`)
- [x] Geist Mono audit — zero references (IBM Plex Mono migration complete)
- [x] DitherSurface audit — only in `components/ui/dither-surface.tsx` definition, not used in panels

## Component Existence Verification

- [x] `ContextMenu.tsx` — exists, portal-rendered, type-specific actions
- [x] `BreadcrumbBar.tsx` — exists, wired into `UnifiedCanvasView`
- [x] `SlashCommandPalette.tsx` — exists, search + keyboard nav + 7 templates
- [x] `AIPreviewBar.tsx` — exists, Accept/Reject/Vary with framer-motion animation
- [x] `InsertionBar.tsx` — exists, hover "+" with inline slash palette integration

## V3.3 Features (must still work)

- [ ] Single-click selects node (blue outline, inspector updates)
- [ ] Double-click on heading → enters contentEditable
- [ ] Double-click on section → action popover (Edit With AI, Add Below, Move, Duplicate, Delete)
- [ ] Double-click on image → action popover with Replace Image
- [ ] Floating format toolbar on selected text node (B/I/U/Font/Color/AI)
- [ ] Toolbar hides during inline editing
- [ ] Section library opens from action popover "Add Section Below"
- [ ] Insert section from library → correct position, syncs across artboards
- [ ] Cmd+D duplicates section
- [ ] Delete removes section
- [ ] Drag handle reorders sections
- [ ] Undo/Redo works for all operations
- [ ] AI prompt composer in inspector bottom split
- [ ] AI contextual pre-fill based on node type

## V4 Features (new)

### Context Menu
- [ ] Right-click on heading → context menu with Edit Text, AI, Duplicate, etc.
- [ ] Right-click on section → context menu with Move Up/Down
- [ ] Right-click on image → context menu with Replace Image
- [ ] Context menu closes on: click outside, Escape, action selected
- [ ] Only one context menu open at a time

### Escape Hierarchy
- [ ] Escape from text editing → node selected (not deselected)
- [ ] Escape from node → parent selected
- [ ] Escape from top-level section → nothing selected

### Deep Select & Navigation
- [ ] Cmd+Click → deepest node at click point selected
- [ ] Regular click → selects parent (existing behavior)
- [ ] Tab → next sibling selected
- [ ] Shift+Tab → previous sibling selected
- [ ] Enter on selected text node → enters editing
- [ ] Breadcrumb shows path when node selected
- [ ] Click breadcrumb segment → ancestor selected

### Keyboard Shortcuts
- [ ] Cmd+D with section selected → duplicated
- [ ] Cmd+D during text editing → browser default (not intercepted)
- [ ] Delete during text editing → character deleted (not intercepted)
- [ ] Cmd+[ → move section up
- [ ] Cmd+] → move section down
- [ ] Cmd+Alt+C → copy style
- [ ] Cmd+Alt+V → paste style (visual properties only, excludes layout)

### Insertion Bars
- [ ] Hover between sections → "+" bar appears
- [ ] Click "+" → slash command palette appears
- [ ] Type to filter → list filters
- [ ] Enter/click → section inserted at correct index
- [ ] "Browse All..." → opens full section library
- [ ] Escape closes slash palette
- [ ] Insertion syncs across all artboards

### AI Preview
- [ ] Trigger AI edit → preview bar shows in inspector
- [ ] Accept → bar disappears, changes persist
- [ ] Reject → canvas reverts, bar disappears
- [ ] Vary → canvas reverts, AI re-runs
- [ ] Select different node during preview → auto-accepts
- [ ] Page reload → preview state cleared (transient)

### Responsive Overrides
- [ ] Edit font-size on Mobile artboard → only Mobile changes
- [ ] Desktop value unchanged after Mobile edit
- [ ] Tablet inherits Desktop unless overridden
- [ ] Blue dot appears on overridden properties in inspector
- [ ] Click dot → property resets to Desktop value
- [ ] Breakpoint label shows at top of inspector on non-desktop
- [ ] "Hide on Mobile" toggle → element hidden on Mobile
- [ ] Text content edit syncs across ALL artboards
- [ ] Undo after override → override removed
- [ ] Inspector fields show resolved values (not desktop base) on non-desktop artboards

### Canvas Fundamentals
- [ ] Space+drag → pan canvas
- [ ] Middle-mouse → pan canvas
- [ ] Scroll wheel → zoom
- [ ] File drop → creates reference item
- [ ] Reference items draggable
- [ ] Reference resize with aspect ratio lock
- [ ] Artboard click overlay prevents navigation

## Bugs Found During Regression

### Bug 1: Inspector reading base style instead of resolved style (FIXED)
**Severity:** Medium
**Location:** `InspectorPanelV3.tsx` line 505
**Issue:** `NodeInspector` read `node.style || {}` instead of `getNodeStyle(node, breakpoint)`. On non-desktop artboards, inspector fields showed desktop values, not the actual overridden values.
**Fix:** Changed to `getNodeStyle(node, bp)` and imported the helper. Fixed in this session.

### Note: NodeFormatToolbar reads base style (KNOWN, LOW PRIORITY)
**Location:** `NodeFormatToolbar.tsx` line 27
**Issue:** Floating B/I/U toolbar reads `node.style ?? {}` instead of resolved style. Since `UPDATE_TEXT_STYLE_SITE` writes to all artboards' base style (site-wide), toggle states are correct for desktop but may not reflect per-breakpoint text overrides.
**Impact:** Low — text formatting is intentionally site-wide, not per-breakpoint. Will matter only if per-breakpoint text formatting is added later.
