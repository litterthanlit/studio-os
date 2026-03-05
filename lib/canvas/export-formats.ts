export function toFramerPasteReady(code: string): string {
  let cleaned = code
    .replace(/^import\s+.*?from\s+['"]react['"];?\s*$/gm, "")
    .replace(
      /^import\s+\{[^}]*\}\s+from\s+['"]framer-motion['"];?\s*$/gm,
      ""
    )
    .replace(/^export\s+default\s+/gm, "export default ")
    .trim();

  if (!cleaned.startsWith("import")) {
    cleaned = `import { motion } from "framer-motion"\n\n${cleaned}`;
  }

  return cleaned;
}

export function downloadTSX(code: string, filename: string) {
  const blob = new Blob([code], { type: "text/typescript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".tsx") ? filename : `${filename}.tsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  }
}
