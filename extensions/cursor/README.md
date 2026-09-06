# Studio OS Cursor plugin

Thin Agent / Cursor plugin that wraps the **live** Studio OS MCP. It does not host tools, mint tokens, or talk to a local stdio server.

- MCP: `https://studio-os.io/api/mcp`
- Auth: `Authorization: Bearer ${STUDIO_OS_API_TOKEN}`
- Token variable: `STUDIO_OS_API_TOKEN` (`sos_live_…` from Settings → Agent connections)

**Not submitted to the Cursor Marketplace.** Local symlink only.

Connect Cursor UI authors: this folder is the plugin path (`extensions/cursor` in [litterthanlit/studio-os](https://github.com/litterthanlit/studio-os)). Point install copy and “Add to Cursor” docs here — not a marketplace listing.

## Install (local)

From this directory (`extensions/cursor`):

```bash
mkdir -p ~/.cursor/plugins/local
ln -s "$PWD" ~/.cursor/plugins/local/studio-os
```

Reload Cursor (Developer: Reload Window). Confirm **Studio OS** under Customize → Plugins, then **Plugins → Configure** and paste the `sos_live_…` token into `STUDIO_OS_API_TOKEN`.

Until a marketplace listing exists (none planned), this symlink is the supported install.

## Token

1. Sign in at [studio-os.io](https://studio-os.io).
2. Open **Settings → Agent connections**.
3. Generate a token. Prefer binding it to one Convex project so agents can omit `projectId`.
4. Paste the value into Plugins → Configure (`STUDIO_OS_API_TOKEN`), or export it in the environment. The plugin repo never contains a real token.

## Core loop

```
list_projects (if the token is unbound)
  → get_canvas          # compact: { projectId, revision?, summary }
  → get_node / patch_node   # DesignNode { id, style?, content?, name? }
```

Bound token: skip `projectId` on every tool. Unbound: pass `Project.id` from `list_projects`. Never invent canvas data.

Data shape:

| Record | Fields | Tool |
| --- | --- | --- |
| Project | `{ id, name, … }` | `list_projects` |
| Canvas | `{ projectId, revision?, summary \| canvasState }` | `get_canvas` |
| DesignNode | `{ id, style?, content?, name? }` | `get_node`, `patch_node` |

`get_canvas` omits `canvasState` unless `includeState: true`. Use `write_canvas` when you need batched ops (`move_item`, `delete_item`, `select_on_canvas`, …).

Skill: `skills/studio-canvas/SKILL.md` (invoke when connecting or editing the canvas).

## Format

Agent Plugins 1.0.0 supports remote `url` + `headers` (`plugin.json` + `mcp.json`) but **does not expand secrets** in those headers and has no `variables` field.

This package therefore also ships a Cursor Plugin manifest at `.cursor-plugin/plugin.json` that declares `STUDIO_OS_API_TOKEN`. Cursor substitutes `${STUDIO_OS_API_TOKEN}` in `mcp.json`. Layout matches Hypher’s `extensions/cursor/` (plugin at this folder, symlink into `~/.cursor/plugins/local`).

## Marketplace

Do **not** submit this plugin at cursor.com/marketplace/publish. Dogfood via the symlink above.

See [VERIFY.md](./VERIFY.md) for PASS criteria (manifests, URL, no secrets). This environment may not run the Cursor IDE.
