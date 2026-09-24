/**
 * Proof gate 1.3 — measured palette, grid and type scale from reference pixels.
 *
 * Synthetic images with a known palette, ratio and column grid must measure
 * within tolerance: palette ΔE < 5 (OKLab ×100), type ratio ±0.05, exact
 * column count. Inconsistent type measurements are rejected. The vision
 * type-box call is exercised with a mocked router (no key needed).
 *
 * Run: npm run proof:intent-measure
 */
import assert from "node:assert/strict";
import sharp from "sharp";
import { deltaE, hexToRgb, measureGrid, measurePalette, measureTypeScale, measureTypeScaleFromBoxes, rgbToOklab } from "../lib/intent/measure";
import { setRouterForTesting } from "../lib/ai/model-router";

async function png(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function oklab(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToOklab(r, g, b);
}

async function testPalette() {
  // 1000 × 600: background 64%, surface 18%, text 8%, accent 10%
  const expected = { background: "#F5F0E8", surface: "#FFFFFF", text: "#1A1A1A", accent: "#D9480F" };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600">
    <rect width="1000" height="600" fill="${expected.background}"/>
    <rect x="0" y="0" width="1000" height="108" fill="${expected.surface}"/>
    <rect x="60" y="200" width="480" height="100" fill="${expected.text}"/>
    <rect x="600" y="400" width="400" height="150" fill="${expected.accent}"/>
  </svg>`;
  const palette = await measurePalette(await png(svg));
  for (const [role, hex] of Object.entries(expected)) {
    const swatch = palette.swatches.find((s) => s.role === role);
    assert.ok(swatch, `role ${role} found (${JSON.stringify(palette.swatches.map((s) => [s.hex, s.role, s.area]))})`);
    const d = deltaE(swatch.oklab, oklab(hex));
    assert.ok(d < 5, `${role} ${swatch.hex} vs ${hex}: ΔE ${d.toFixed(2)} < 5`);
  }
  const area = (role: string) => palette.swatches.find((s) => s.role === role)!.area;
  assert.ok(Math.abs(area("background") - 0.64) < 0.04, `background area ${area("background")} ≈ 0.64`);
  assert.ok(Math.abs(area("accent") - 0.1) < 0.03, `accent area ${area("accent")} ≈ 0.10`);
  console.log(`[proof] palette: ${palette.swatches.map((s) => `${s.role} ${s.hex} ${(s.area * 100).toFixed(0)}%`).join(" · ")}`);
}

async function testGrid() {
  // 1440 wide, 12 columns, 24px gutters, 120px margins → column 78px.
  const margin = 120;
  const gutter = 24;
  const columns = 12;
  const col = (1440 - 2 * margin - (columns - 1) * gutter) / columns;
  const x = (i: number) => margin + i * (col + gutter);
  const band = (y: number, h: number, spans: Array<[number, number]>, fill: string) =>
    spans.map(([start, span]) => `<rect x="${x(start)}" y="${y}" width="${span * col + (span - 1) * gutter}" height="${h}" fill="${fill}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900">
    <rect width="1440" height="900" fill="#FFFFFF"/>
    ${band(40, 180, [[0, 12]], "#1A1A1A")}
    ${band(260, 120, Array.from({ length: 12 }, (_, i) => [i, 1] as [number, number]), "#E5E5E0")}
    ${band(420, 200, [[0, 4], [4, 4], [8, 4]], "#EDF1FE")}
    ${band(660, 160, [[0, 8], [8, 4]], "#D1E4FC")}
  </svg>`;
  const grid = await measureGrid(await png(svg));
  assert.ok(grid, "grid measured");
  assert.equal(grid.columns, 12, `exact column count (got ${grid.columns})`);
  assert.ok(Math.abs(grid.gutter - gutter) <= 4, `gutter ${grid.gutter} ≈ ${gutter}`);
  assert.ok(Math.abs(grid.marginLeft - margin) <= 4 && Math.abs(grid.marginRight - margin) <= 4, `margins ${grid.marginLeft}/${grid.marginRight} ≈ ${margin}`);
  assert.ok(Math.abs(grid.columnWidth - col) <= 4, `column ${grid.columnWidth} ≈ ${col}`);
  assert.equal(grid.confidence, 1, "every band lands on the grid");

  const threeCol = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500">
    <rect width="1200" height="500" fill="#0F0F0F"/>
    ${[0, 1, 2].map((i) => `<rect x="${80 + i * (320 + 40)}" y="80" width="320" height="300" fill="#E8E4DF"/>`).join("")}
  </svg>`;
  const three = await measureGrid(await png(threeCol));
  assert.equal(three?.columns, 3, "dark UI, 3 columns");
  console.log(`[proof] grid: ${grid.columns} cols · ${grid.columnWidth}px col · ${grid.gutter}px gutter · ${grid.marginLeft}/${grid.marginRight}px margins (dark 3-col: ${three?.columns})`);
}

async function testTypeScale() {
  const ratio = 1.333;
  const base = 12; // cap height of body text in px
  const boxes = [0, 1, 2, 3, 4].flatMap((n) => {
    const h = base * ratio ** n;
    return [{ heightPx: Math.round(h) }, { heightPx: Math.round(h * 1.01 * 10) / 10 }, { heightPx: Math.round(h * 0.99 * 10) / 10 }];
  });
  const measured = measureTypeScaleFromBoxes(boxes);
  assert.ok(measured.accepted, measured.reason);
  assert.ok(Math.abs(measured.ratio - ratio) <= 0.05, `ratio ${measured.ratio} ≈ ${ratio}`);
  assert.equal(measured.named, "perfect fourth");

  const skipped = measureTypeScaleFromBoxes([0, 1, 3, 5].map((n) => ({ heightPx: 14 * 1.25 ** n })));
  assert.ok(skipped.accepted && Math.abs(skipped.ratio - 1.25) <= 0.05, `skipped levels still fit 1.25 (${skipped.ratio})`);

  for (const r of [1.2, 1.25, 1.414, 1.5, 1.618]) {
    const fit = measureTypeScaleFromBoxes([0, 1, 2, 3, 4].map((n) => ({ heightPx: Math.round(12 * r ** n) })));
    assert.ok(fit.accepted && Math.abs(fit.ratio - r) <= 0.05, `ratio ${r} measured as ${fit.ratio}`);
  }
  const inconsistent = measureTypeScaleFromBoxes([10, 11.5, 14.8, 16.1, 23.7, 26.2].map((heightPx) => ({ heightPx })));
  assert.equal(inconsistent.accepted, false, `inconsistent sizes rejected (${inconsistent.reason})`);
  assert.equal(measureTypeScaleFromBoxes([{ heightPx: 12 }, { heightPx: 30 }]).accepted, false, "too few sizes rejected");

  // Vision path: strict schema, junk entries dropped (mocked router).
  setRouterForTesting({
    chat: {
      completions: {
        create: async () => ({
          model: "mock",
          choices: [{
            message: {
              content: JSON.stringify({
                boxes: [...boxes.map((b) => ({ ...b, text: "Aa" })), { heightPx: "big" }, { heightPx: -3 }, null],
              }),
            },
            finish_reason: "stop",
          }],
        }),
      },
    },
  } as never);
  try {
    const viaModel = await measureTypeScale("https://img.example/type.png");
    assert.equal(viaModel.boxes.length, boxes.length, "invalid boxes dropped");
    assert.ok(Math.abs(viaModel.ratio - ratio) <= 0.05);
  } finally {
    setRouterForTesting(null);
  }
  console.log(`[proof] type: ratio ${measured.ratio} (${measured.named}), sizes ${measured.sizes.join("/")}; inconsistent → rejected`);
}

async function main() {
  await testPalette();
  await testGrid();
  await testTypeScale();
  console.log("intent-measure proof passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
