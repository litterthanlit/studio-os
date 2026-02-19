export type CollageLayout = "grid" | "masonry" | "minimal";

export type CollageReference = {
  id: string;
  imageUrl: string;
  notes?: string;
  tags: {
    colors: string[];
  };
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    if (!url.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = url;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const scale = Math.max(dw / img.width, dh / img.height);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color = "#2a2a2a"
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export async function exportMoodboardCollage(
  references: CollageReference[],
  layout: CollageLayout,
  projectName = "Studio Moodboard"
): Promise<void> {
  const W = 3000;
  const H = 2000;
  const STRIP_H = 100;
  const CONTENT_H = H - STRIP_H;
  const PAD = layout === "minimal" ? 64 : 16;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Load images
  const maxItems = layout === "minimal" ? 4 : layout === "masonry" ? 12 : 12;
  const items = references.slice(0, maxItems);
  const images = await Promise.all(items.map((r) => loadImage(r.imageUrl)));

  if (layout === "grid") {
    const COLS = items.length <= 6 ? 3 : 4;
    const ROWS = Math.ceil(items.length / COLS);
    const cellW = Math.floor((W - PAD * (COLS + 1)) / COLS);
    const cellH = Math.floor((CONTENT_H - PAD * (ROWS + 1)) / ROWS);

    items.forEach((_, i) => {
      const img = images[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = PAD + col * (cellW + PAD);
      const y = PAD + row * (cellH + PAD);

      if (img) {
        drawCover(ctx, img, x, y, cellW, cellH);
      } else {
        drawPlaceholder(ctx, x, y, cellW, cellH);
      }
    });
  } else if (layout === "masonry") {
    const COLS = 3;
    const colW = Math.floor((W - PAD * (COLS + 1)) / COLS);
    const colHeights = [PAD, PAD, PAD];

    items.forEach((_, i) => {
      const img = images[i];
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = PAD + col * (colW + PAD);
      const y = colHeights[col];
      const aspect = img ? img.height / img.width : 1.3 + (i % 3) * 0.2;
      const cellH = Math.min(Math.floor(colW * aspect), Math.floor(CONTENT_H * 0.5));

      if (img) {
        drawCover(ctx, img, x, y, colW, cellH);
      } else {
        drawPlaceholder(ctx, x, y, colW, cellH);
      }
      colHeights[col] = y + cellH + PAD;
    });
  } else {
    // Minimal — 2×2 centered with generous whitespace
    const COLS = 2;
    const areaW = Math.floor(W * 0.82);
    const areaH = Math.floor(CONTENT_H * 0.82);
    const startX = Math.floor((W - areaW) / 2);
    const startY = Math.floor((CONTENT_H - areaH) / 2);
    const cellW = Math.floor((areaW - PAD) / COLS);
    const cellH = Math.floor((areaH - PAD) / COLS);

    items.slice(0, 4).forEach((_, i) => {
      const img = images[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (cellW + PAD);
      const y = startY + row * (cellH + PAD);

      if (img) {
        drawCover(ctx, img, x, y, cellW, cellH);
      } else {
        drawPlaceholder(ctx, x, y, cellW, cellH);
      }
    });
  }

  // ── Bottom strip ──────────────────────────────────────────────────────
  const stripY = CONTENT_H;
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, stripY, W, STRIP_H);

  // Project name
  ctx.fillStyle = "#ffffff";
  ctx.font = `500 ${Math.floor(STRIP_H * 0.36)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(projectName, 48, stripY + STRIP_H / 2);

  // Color palette circles in center
  const allColors = Array.from(
    new Set(references.flatMap((r) => r.tags.colors))
  ).slice(0, 10);
  const circleR = 14;
  const circleSpacing = 36;
  const totalCircleW = allColors.length * circleSpacing;
  let cx = Math.floor((W - totalCircleW) / 2) + circleR;
  const cy = stripY + STRIP_H / 2;

  allColors.forEach((c) => {
    ctx.beginPath();
    ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.stroke();
    cx += circleSpacing;
  });

  // Watermark (30% opacity)
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 ${Math.floor(STRIP_H * 0.28)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("Studio OS", W - 48, stripY + STRIP_H / 2);
  ctx.globalAlpha = 1;

  // Download as PNG
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(projectName)}-moodboard.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    "image/png"
  );
}
