import type { DesignNode } from "./design-node";
import { designNodeToHTML } from "./design-node-to-html";
import { BREAKPOINT_WIDTHS } from "./compose";
import { collectDesignFontFamilies, designFontLinkTags } from "./font-links";

export type DesignNodeScreenshotOptions = {
  /** Viewport width — pass the artboard width (1440 desktop / 375 mobile). */
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
};

export type DesignNodeScreenshotFontCheck = {
  family: string;
  /** `document.fonts.check()` inside the rendered page after fonts settle. */
  loaded: boolean;
};

export type DesignNodeScreenshotResult = {
  dataUrl: string;
  fonts: DesignNodeScreenshotFontCheck[];
};

const DEFAULT_WIDTH = BREAKPOINT_WIDTHS.desktop;
const DEFAULT_HEIGHT = 720;
/** Body fallback font for text nodes without an explicit fontFamily. */
const BASE_FONT_FAMILY = "Geist";

/** Full HTML page used for screenshots: design font links + base body font. */
export function buildScreenshotDocument(tree: DesignNode): string {
  const fragment = designNodeToHTML(tree, { outputMode: "fragment" });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${designFontLinkTags(tree, [BASE_FONT_FAMILY])}
<style>
  html, body { margin: 0; padding: 0; background: #FAFAF8; }
  body { font-family: "${BASE_FONT_FAMILY}", system-ui, sans-serif; }
</style>
</head>
<body>
${fragment}
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

function proxyLaunchArgs(): string[] {
  const proxy = process.env.HTTPS_PROXY?.trim() || process.env.https_proxy?.trim();
  return proxy ? [`--proxy-server=${proxy}`] : [];
}

/**
 * Render a DesignNode tree to a PNG data URL for vision-model critique.
 * Returns null when headless Chrome is unavailable (graceful skip).
 */
export async function renderDesignNodeScreenshotDataUrl(
  tree: DesignNode,
  options?: DesignNodeScreenshotOptions,
): Promise<string | null> {
  const result = await renderDesignNodeScreenshot(tree, options);
  return result?.dataUrl ?? null;
}

/**
 * Render a DesignNode tree to PNG and report which design fonts actually loaded.
 * Returns null when headless Chrome is unavailable (graceful skip).
 */
export async function renderDesignNodeScreenshot(
  tree: DesignNode,
  options?: DesignNodeScreenshotOptions,
): Promise<DesignNodeScreenshotResult | null> {
  if (process.env.STUDIO_OS_DISABLE_SCREENSHOT === "true") {
    return null;
  }

  const width = options?.width ?? DEFAULT_WIDTH;
  const height = options?.height ?? DEFAULT_HEIGHT;
  const deviceScaleFactor = options?.deviceScaleFactor ?? 1;

  const html = buildScreenshotDocument(tree);
  const families = collectDesignFontFamilies(tree);
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
      ...proxyLaunchArgs(),
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
    // Stylesheets only fetch font files for glyphs in use; force-load every design family, then settle.
    const fonts = await page.evaluate(async (fontFamilies: string[]) => {
      await Promise.all(
        fontFamilies.map((family) =>
          document.fonts.load(`16px "${family}"`).catch(() => []),
        ),
      );
      await document.fonts.ready;
      return fontFamilies.map((family) => ({
        family,
        loaded: document.fonts.check(`16px "${family}"`) &&
          [...document.fonts].some(
            (face) => face.family.replace(/["']/g, "") === family && face.status === "loaded",
          ),
      }));
    }, families);

    const missing = fonts.filter((f) => !f.loaded).map((f) => f.family);
    if (missing.length > 0) {
      console.warn("[design-node-screenshot] Fonts did not load:", missing.join(", "));
    }

    const buffer = await page.screenshot({
      type: "png",
      fullPage: true,
      captureBeyondViewport: true,
    });

    const base64 = Buffer.from(buffer).toString("base64");
    return { dataUrl: `data:image/png;base64,${base64}`, fonts };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[design-node-screenshot] Screenshot failed:", message);
    return null;
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
