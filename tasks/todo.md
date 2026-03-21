# Canvas Task Tracker

## V3.2 — Done
- [x] Phase 1: Regression gate — full V3.1 checklist passed, 1 bug fixed (font select undo order)
- [x] Phase 2: Inspector shared primitives (InspectorField.tsx) + all 6 inspector states rebuilt
- [x] Phase 3: Spacing box model (SpacingDiagram.tsx) + color picker refinement (portal, viewport clamping, document colors, hex normalization)
- [x] Phase 4: Top-level section drag-reorder (REORDER_NODE reducer, SectionDragHandle, cross-artboard sync)
- [x] Phase 5: Final regression + docs — full test plan passed, 2 lint fixes, documentation updated

## V3.1 — Done
- [x] Prompt 1: Middle-mouse pan fix
- [x] Prompt 2: Embed prompt in right panel
- [x] Prompt 3: Editing clarity & live feel
- [x] Prompt 4: Reference resize
- [x] Prompt 5: Visual polish & canvas feel
- [x] Prompt 6: IBM Plex Mono font replacement
- [x] Prompt 7: Full regression pass

## V3.4 Session 1 — Right-Click Context Menu
- [x] Add shared context-menu state and viewport-clamped dismiss logic in `ComposeDocumentView`
- [x] Create minimal portal-based `ContextMenu.tsx` placeholder with type-specific rows
- [x] Wire reducer-backed actions for edit/AI/duplicate/reorder/delete and optional image replace
- [x] Run TypeScript + canvas token verification and update docs/dev log

## V3.4 Session 3 — Keyboard Shortcuts + Style Copy/Paste + Enter Edit
- [x] Patch `useCanvasKeyboard.ts` for structural shortcuts, style clipboard, and Enter guards
- [x] Patch `ComposeDocumentView.tsx` for custom edit/outline flash events in `Selectable`
- [x] Run `npx tsc --noEmit` and note manual verification checks
