"use client";

import React from "react";
import { RotateCw } from "lucide-react";
import type { TasteProfile } from "@/types/taste-profile";
import type { FidelityMode } from "@/lib/canvas/directive-compiler";
import { InspectorSegmented } from "./inspector/InspectorSegmented";

interface TasteCardProps {
  tasteProfile: TasteProfile | null;
  fidelityMode: FidelityMode;
  onFidelityChange: (mode: FidelityMode) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  refreshError: boolean;
  hasReferences: boolean;
}

const FIDELITY_OPTIONS = [
  { value: "close", label: "Safe" },
  { value: "balanced", label: "Balanced" },
  { value: "push", label: "Creative" },
];

export function TasteCard({
  tasteProfile,
  fidelityMode,
  onFidelityChange,
  onRefresh,
  isRefreshing,
  refreshError,
  hasReferences,
}: TasteCardProps) {
  // Empty state — no taste profile
  if (!tasteProfile) {
    return (
      <div className="px-3 py-3">
        <p className="text-[11px] text-[#A0A0A0]">
          Add references and generate to extract your taste profile
        </p>
      </div>
    );
  }

  const {
    summary,
    archetypeMatch,
    archetypeConfidence,
    adjectives,
    colorBehavior,
    layoutBias,
    typographyTraits,
    imageTreatment,
    ctaTone,
    avoid,
    confidence,
    referenceCount,
    dominantReferenceType,
    warnings,
  } = tasteProfile;

  const isLowConfidence = archetypeConfidence < 0.5;

  // Color swatches: prefer suggestedColors, fall back to palette name
  const colors: string[] = [];
  if (colorBehavior?.suggestedColors) {
    const sc = colorBehavior.suggestedColors;
    if (sc.background) colors.push(sc.background);
    if (sc.surface) colors.push(sc.surface);
    if (sc.text) colors.push(sc.text);
    if (sc.accent) colors.push(sc.accent);
    if (sc.secondary) colors.push(sc.secondary);
  }

  // Avoid list: show max 3, "+N more" tooltip for rest
  const visibleAvoids = avoid.slice(0, 3);
  const extraAvoidCount = Math.max(0, avoid.length - 3);

  return (
    <div className="px-3 pt-3 pb-2">
      {/* Header: TASTE label + archetype + refresh */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#8A8A8A] shrink-0">
            Taste
          </span>

          {/* Archetype badge */}
          {isLowConfidence ? (
            <span className="text-[11px] text-[#A0A0A0] truncate">
              {archetypeMatch} · {Math.round(archetypeConfidence * 100)}% (low confidence)
            </span>
          ) : (
            <span className="bg-[#F5F5F0] text-[#1A1A1A] text-[11px] font-medium rounded-[4px] px-2 py-0.5 truncate">
              {archetypeMatch}
              <span className="text-[#A0A0A0] text-[11px] font-mono ml-1">
                {Math.round(archetypeConfidence * 100)}%
              </span>
            </span>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing || !hasReferences}
          className={`shrink-0 p-1 rounded-[4px] transition-colors ${
            !hasReferences
              ? "text-[#E5E5E0] cursor-default"
              : isRefreshing
                ? "text-[#A0A0A0] cursor-wait"
                : refreshError
                  ? "text-red-500"
                  : "text-[#A0A0A0] hover:text-[#4B57DB] cursor-pointer"
          }`}
          title="Refresh taste profile"
        >
          <RotateCw
            size={12}
            className={isRefreshing ? "animate-spin" : ""}
          />
        </button>
      </div>

      <div className="mb-2 rounded-[4px] border border-[#E5E5E0] bg-white/70 px-2.5 py-2 dark:border-[#333333] dark:bg-[#202020]">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[1px] text-[#8A8A8A]">
            Taste brief
          </span>
          <span className="font-mono text-[10px] text-[#A0A0A0]">
            {referenceCount} refs · {Math.round(confidence * 100)}%
          </span>
        </div>
        <p className="text-[11px] leading-snug text-[#4A4A4A] dark:text-[#D0D0D0]">
          {summary || `A ${archetypeMatch} direction from ${dominantReferenceType} references.`}
        </p>
      </div>

      {/* Adjective pills — limit 5 */}
      {adjectives.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {adjectives.slice(0, 5).map((adj) => (
            <span
              key={adj}
              className="bg-[#D1E4FC]/30 text-[#4B57DB] text-[10px] rounded-[2px] px-1.5 py-0.5"
            >
              {adj}
            </span>
          ))}
        </div>
      )}

      {/* Color swatches */}
      {colors.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          {colors.slice(0, 6).map((color, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full border border-[#E5E5E0] shrink-0"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}

      {/* Layout traits */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2 text-[11px] text-[#6B6B6B]">
        {layoutBias.density && (
          <span>
            Density: <span className="text-[#1A1A1A]">{layoutBias.density}</span>
          </span>
        )}
        {layoutBias.heroStyle && (
          <span>
            Hero: <span className="text-[#1A1A1A]">{layoutBias.heroStyle}</span>
          </span>
        )}
        {layoutBias.whitespaceIntent && (
          <span>
            Space: <span className="text-[#1A1A1A]">{layoutBias.whitespaceIntent}</span>
          </span>
        )}
      </div>

      <div className="mb-2 grid grid-cols-2 gap-1.5 text-[10px] leading-snug">
        <TasteBriefTrait label="Type" value={`${typographyTraits.headingTone} · ${typographyTraits.scale}`} />
        <TasteBriefTrait label="Images" value={`${imageTreatment.style} · ${imageTreatment.sizing}`} />
        <TasteBriefTrait label="Color" value={`${colorBehavior.mode} · ${colorBehavior.accentStrategy}`} />
        <TasteBriefTrait label="CTA" value={`${ctaTone.style} · ${ctaTone.hierarchy}`} />
      </div>

      {/* Avoid list */}
      {visibleAvoids.length > 0 && (
        <div className="text-[11px] text-[#A0A0A0] mb-2">
          <span>Avoids: </span>
          {visibleAvoids.map((item, i) => (
            <React.Fragment key={item}>
              <span className="text-red-400/70">{item}</span>
              {i < visibleAvoids.length - 1 && <span>, </span>}
            </React.Fragment>
          ))}
          {extraAvoidCount > 0 && (
            <span
              className="ml-1 cursor-default"
              title={avoid.slice(3).join(", ")}
            >
              +{extraAvoidCount} more
            </span>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mb-2 rounded-[4px] bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {warnings[0]}
        </div>
      )}

      {/* Fidelity selector */}
      <div className="pt-1">
        <InspectorSegmented
          value={fidelityMode}
          options={FIDELITY_OPTIONS}
          onChange={(v) => onFidelityChange(v as FidelityMode)}
        />
      </div>
    </div>
  );
}

function TasteBriefTrait({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[3px] bg-[#F5F5F0] px-2 py-1 dark:bg-[#242424]">
      <div className="font-mono uppercase tracking-[0.08em] text-[#A0A0A0]">
        {label}
      </div>
      <div className="truncate text-[#4A4A4A] dark:text-[#D0D0D0]" title={value}>
        {value}
      </div>
    </div>
  );
}
