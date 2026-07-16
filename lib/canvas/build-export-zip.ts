"use client";

/**
 * Track 10 Phase A — ZIP export with optional React + Tailwind artifacts (Phase 7).
 */

export type ExportZipContents = {
  html: string;
  tsx?: string;
  tokensCss?: string;
  tailwindTokensJs?: string;
  componentFileName?: string;
};

export async function buildExportZipBlob(
  contents: ExportZipContents | string,
): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const payload: ExportZipContents =
    typeof contents === "string" ? { html: contents } : contents;

  zip.file("index.html", payload.html);

  if (payload.tsx) {
    zip.file(payload.componentFileName ?? "Component.tsx", payload.tsx);
  }
  if (payload.tokensCss) {
    zip.file("tokens.css", payload.tokensCss);
  }
  if (payload.tailwindTokensJs) {
    zip.file("tailwind.tokens.js", payload.tailwindTokensJs);
  }

  const readmeLines = [
    "Open `index.html` in a web browser. External images load from the network.",
  ];
  if (payload.tsx) {
    readmeLines.push(
      "",
      "`Component.tsx` is a React + Tailwind export. Import it in your app and include `tokens.css` or merge `tailwind.tokens.js` into your Tailwind config.",
    );
  }

  zip.file("README.md", `${readmeLines.join("\n")}\n`);

  return zip.generateAsync({ type: "blob" });
}
