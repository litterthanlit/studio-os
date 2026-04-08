import type { BlurEffect, DesignNodeStyle, EffectEntry, ShadowEffect } from "./design-node";

function effectId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseShadow(shadow: string): ShadowEffect[] {
  const raw = shadow.trim();
  if (!raw) return [];
  // Keep parsing conservative: only migrate simple CSS shadow strings.
  const match = raw.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px(?:\s+(-?\d+)px)?\s+(.+)/i);
  if (!match) return [];
  const [, x, y, blur, spread, color] = match;
  return [{
    id: effectId("fx"),
    type: "dropShadow",
    enabled: true,
    x: Number(x),
    y: Number(y),
    blur: Number(blur),
    spread: spread != null ? Number(spread) : 0,
    color: color.trim(),
  }];
}

export function normalizeLegacyEffects(style: DesignNodeStyle): EffectEntry[] | undefined {
  if (Array.isArray(style.effects)) return style.effects;

  const effects: EffectEntry[] = [];
  if (style.shadow) effects.push(...parseShadow(style.shadow));
  if (typeof style.blur === "number" && style.blur > 0) {
    const layerBlur: BlurEffect = {
      id: effectId("fx"),
      type: "layerBlur",
      enabled: true,
      radius: style.blur,
    };
    effects.push(layerBlur);
  }

  return effects.length > 0 ? effects : undefined;
}

export function shadowEffectsToCss(effects: EffectEntry[]): string | undefined {
  const shadows = effects
    .filter((effect): effect is ShadowEffect => effect.type === "dropShadow" || effect.type === "innerShadow")
    .filter((effect) => effect.enabled !== false)
    .map((effect) => {
      const inset = effect.type === "innerShadow" ? "inset " : "";
      return `${inset}${effect.x}px ${effect.y}px ${effect.blur}px ${effect.spread}px ${effect.color}`;
    });
  return shadows.length > 0 ? shadows.join(", ") : undefined;
}

export function blurEffectsToCss(effects: EffectEntry[]): {
  filter?: string;
  backdropFilter?: string;
} {
  const enabled = effects.filter((effect) => effect.enabled !== false);
  const layerBlur = enabled.find((effect): effect is BlurEffect => effect.type === "layerBlur");
  const backgroundBlur = enabled.find((effect): effect is BlurEffect => effect.type === "backgroundBlur");
  return {
    filter: layerBlur ? `blur(${layerBlur.radius}px)` : undefined,
    backdropFilter: backgroundBlur ? `blur(${backgroundBlur.radius}px)` : undefined,
  };
}
