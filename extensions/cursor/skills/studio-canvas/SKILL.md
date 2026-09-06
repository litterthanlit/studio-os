---
name: studio-canvas
description: Edit a live Studio OS canvas from Cursor. Use when connecting an agent to Studio OS, listing projects, reading canvas state, or patching DesignNodes via the remote MCP.
---

# Studio canvas

Wrap the live Studio OS MCP at `https://studio-os.io/api/mcp`. Do not invent projects, canvas trees, or node ids. Do not reimplement the server.

## Data shape

Organize every call around these records. Treat extra fields as opaque; do not fabricate them.

- **Project** `{ id, name, … }` — `list_projects`
- **Canvas** `{ projectId, revision?, summary | canvasState }` — `get_canvas`
- **DesignNode** `{ id, style?, content?, name? }` — `get_node` / `patch_node`

`get_canvas` is compact by default (`summary`, no full tree). Pass `includeState: true` only when you need `canvasState`. Prefer `get_node` over loading the whole tree.

## When to use

- The user wants an agent connected to Studio OS.
- Editing artboards, frames, or text on a Studio OS canvas from Cursor.
- Reading or writing DesignNodes on a live project.

## Steps

1. **Ensure the token is configured.** The user mints a **project-bound** `sos_live_…` token from canvas **Agent → Connect Cursor** (Convex `agentTokens.create`, name Cursor). Settings → Agent connections is for list/revoke. Set `STUDIO_OS_API_TOKEN` in the environment or paste it into Plugins → Configure. Never invent or commit a token.
2. **Resolve the project.** If the token is unbound, call `list_projects` and use `Project.id`. If the token is bound, skip `projectId` on every tool.
3. **Read compact canvas.** Call `get_canvas` (omit `includeState` unless the full JSON is required). Use `Canvas.summary` item ids / artboard ids; keep `revision` for later writes.
4. **Edit nodes, not guesses.** Call `get_node` with `itemId` + `nodeId` from the summary. Change only returned fields via `patch_node` (`style`, `content`, `name`) or `write_canvas` operations (`patch_node`, `move_item`, `select_on_canvas`, `delete_item`, …).
5. **Bound token = omit `projectId`.** The MCP fills it from the token. Unbound tokens must pass `projectId` from step 2.

## Constraints

- Never invent canvas data, node ids, or project ids.
- Bound tokens skip `projectId`; unbound tokens require it.
- Default to compact `get_canvas`. Full `canvasState` is opt-in.
- Tools already registered on the live server (do not add local stubs): `list_projects`, `get_canvas`, `get_node`, `get_screen_design`, `generate_screen`, `generate_screen_set`, `review_implementation`, `write_canvas`, `patch_node`, `move_item`, `select_on_canvas`, `delete_item`, `get_design_contract`, `request_design`, `submit_screenshot_for_review`.
