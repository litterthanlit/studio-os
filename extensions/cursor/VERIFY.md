# Studio OS plugin — verify

This Cloud Agent environment does **not** run the Cursor IDE. Local install and MCP handshake must be confirmed on a machine with Cursor. Use the checks below as PASS criteria before merge.

## Local install (human / Cursor IDE)

From `extensions/cursor`:

```bash
mkdir -p ~/.cursor/plugins/local
ln -s "$PWD" ~/.cursor/plugins/local/studio-os
```

Then: Reload Window → Customize → Plugins → **Studio OS** enabled → Plugins → Configure → `STUDIO_OS_API_TOKEN` = `sos_live_…` from Settings → Agent connections.

IDE PASS:

- [ ] Plugin appears after symlink + reload
- [ ] MCP URL is `https://studio-os.io/api/mcp`
- [ ] Tools listed after a real token is set (do not invent one)
- [ ] Bound token: `get_canvas` works without `projectId`
- [ ] Unbound token: `list_projects` then `get_canvas` with `Project.id`

## Manifest PASS (run anywhere)

```bash
cd extensions/cursor

# 1. Agent Plugin manifests parse as JSON
python3 -c "import json; json.load(open('plugin.json')); json.load(open('mcp.json'))"

# 2. Validate against Agent Plugins 1.0.0 schemas
python3 <<'PY'
import json, urllib.request, sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet", "jsonschema", "referencing"])
    import jsonschema

root = Path(".")
plugin = json.loads(root.joinpath("plugin.json").read_text())
mcp = json.loads(root.joinpath("mcp.json").read_text())

def fetch(url):
    with urllib.request.urlopen(url) as res:
        return json.load(res)

plugin_schema = fetch("https://agent-plugins.org/schemas/1.0.0/plugin.schema.json")
mcp_schema = fetch("https://agent-plugins.org/schemas/1.0.0/mcp.schema.json")
jsonschema.Draft202012Validator(plugin_schema).validate(plugin)
jsonschema.Draft202012Validator(mcp_schema).validate(mcp)
assert plugin["name"] == "studio-os"
assert plugin["version"] == "0.1.0"
assert mcp["mcpServers"]["studio-os"]["url"] == "https://studio-os.io/api/mcp"
assert mcp["mcpServers"]["studio-os"]["headers"]["Authorization"] == "Bearer ${STUDIO_OS_API_TOKEN}"
print("PASS: Agent Plugin plugin.json + mcp.json")
PY

# 3. Cursor Plugin variables (secret name only — no value)
python3 <<'PY'
import json
from pathlib import Path
cursor = json.loads(Path(".cursor-plugin/plugin.json").read_text())
assert cursor["name"] == "studio-os"
assert "STUDIO_OS_API_TOKEN" in cursor["variables"]["properties"]
assert "STUDIO_OS_API_TOKEN" in cursor["variables"]["required"]
print("PASS: Cursor Plugin variables declare STUDIO_OS_API_TOKEN")
PY

# 4. No committed secrets (placeholder only)
! grep -RInE 'sos_live_[A-Za-z0-9]{16,}' --exclude-dir=.git . || true
python3 <<'PY'
from pathlib import Path
import re
pat = re.compile(r"sos_live_[A-Za-z0-9]{16,}")
bad = []
for path in Path(".").rglob("*"):
    if path.is_file() and path.suffix not in {".png", ".webp", ".jpg"}:
        text = path.read_text(errors="ignore")
        for m in pat.finditer(text):
            if m.group(0) != "sos_live_" and "${STUDIO_OS_API_TOKEN}" not in m.group(0):
                # Allow prose "sos_live_…" ellipsis; reject hex-like suffixes
                suffix = m.group(0)[len("sos_live_"):]
                if suffix.replace("…", "").isalnum() and len(suffix) >= 16 and "…" not in m.group(0):
                    bad.append((str(path), m.group(0)[:24]))
if bad:
    raise SystemExit(f"FAIL: possible token committed: {bad}")
print("PASS: no sos_live secrets committed")
PY
```

## PASS checklist

| Check | Expected |
| --- | --- |
| Agent Plugin `plugin.json` | Validates against `plugin.schema.json`; name `studio-os`; version `0.1.0` |
| `mcp.json` | Validates against `mcp.schema.json`; `type` `streamable-http`; URL `https://studio-os.io/api/mcp`; only `Authorization: Bearer ${STUDIO_OS_API_TOKEN}` |
| Cursor variables | `.cursor-plugin/plugin.json` requires `STUDIO_OS_API_TOKEN` |
| Secrets | No real `sos_live_` token in the tree |
| Marketplace | No `.cursor-plugin/marketplace.json`; README says do not submit |
| Scope | Files under `extensions/cursor/` only |

Agent Plugins 1.0.0 allows remote `url` + `headers` but **must not expand** header placeholders and has no `variables` field. Bearer substitution is Cursor Plugin-only (`${STUDIO_OS_API_TOKEN}`). That is why both manifests exist.
