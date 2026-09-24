// lib/intent/measure/index.ts
// Measured reference facts (master plan 1.3): palette, grid and type scale.

export { measurePalette, measurePaletteFromPixels, type MeasuredPalette, type MeasuredSwatch } from "./palette";
export { measureGrid, measureGridFromPixels, type MeasuredGrid } from "./grid";
export { measureTypeScale, measureTypeScaleFromBoxes, parseTextBoxes, type MeasuredTypeScale, type TextBox } from "./type";
export { deltaE, hexToRgb, rgbToHex, rgbToOklab } from "./color";

export const MEASURE_VERSION = "measure-v1";
