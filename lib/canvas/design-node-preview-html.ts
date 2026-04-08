// lib/canvas/design-node-preview-html.ts
// Full HTML document for iframe previews of DesignNode trees (gallery, thumbnails).

import type { DesignNode } from "./design-node";
import { designNodeToHTML } from "./design-node-to-html";

const BASE_STYLE = `
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
`;

/** Self-contained HTML document suitable for iframe `srcDoc` (static preview, no scripts). */
export function designNodeToPreviewDocument(node: DesignNode): string {
  const fragment = designNodeToHTML(node, { outputMode: "fragment" });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Preview</title>
<style>${BASE_STYLE}</style>
</head>
<body>
${fragment}
</body>
</html>`;
}
