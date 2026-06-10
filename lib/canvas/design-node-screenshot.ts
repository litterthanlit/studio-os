import type { DesignNode } from "./design-node";
import { designNodeToHTML } from "./design-node-to-html";

export type DesignNodeScreenshotOptions = {
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
};

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

function wrapRenderableDocument(htmlBody: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; background: #FAFAF8; }
  body { font-family: "Geist Sans", system-ui, sans-serif; }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;
}

async function resolveExecutablePath(): Promise<string | null> {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv) return fromEnv;

  const candidates = [
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const candidate of candidates) {
    try {
      const { access } = await import("node:fs/promises");
      await access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }

  try {
    const chromium = await import("@sparticuz/chromium");
    return await chromium.default.executablePath();
  } catch {
    return null;
  }
}

/**
 * Render a DesignNode tree to a PNG data URL for vision-model critique.
 * Returns null when headless Chrome is unavailable (graceful skip).
 */
export async function renderDesignNodeScreenshotDataUrl(
  tree: DesignNode,
  options?: DesignNodeScreenshotOptions,
): Promise<string | null> {
  if (process.env.STUDIO_OS_DISABLE_SCREENSHOT === "true") {
    return null;
  }

  const width = options?.width ?? DEFAULT_WIDTH;
  const height = options?.height ?? DEFAULT_HEIGHT;
  const deviceScaleFactor = options?.deviceScaleFactor ?? 1;

  const fragment = designNodeToHTML(tree, { outputMode: "fragment" });
  const html = wrapRenderableDocument(fragment);
  const executablePath = await resolveExecutablePath();
  if (!executablePath) {
    console.warn("[design-node-screenshot] No Chromium executable found; skipping screenshot");
    return null;
  }

  let browser: Awaited<ReturnType<(typeof import("puppeteer-core"))["default"]["launch"]>> | null = null;
  try {
    const puppeteer = await import("puppeteer-core");
    const launchArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ];

    try {
      const chromium = await import("@sparticuz/chromium");
      launchArgs.unshift(...chromium.default.args);
    } catch {
      // local Chrome path
    }

    browser = await puppeteer.default.launch({
      executablePath,
      headless: true,
      args: launchArgs,
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 20_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const buffer = await page.screenshot({
      type: "png",
      fullPage: true,
      captureBeyondViewport: true,
    });

    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[design-node-screenshot] Screenshot failed:", message);
    return null;
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
