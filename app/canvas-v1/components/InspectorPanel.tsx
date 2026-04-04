"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ComposeDocument, PageNode, PageNodeContent, PageNodeStyle } from "@/lib/canvas/compose";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";

type InspectorTabValue = "content" | "style" | "layout" | "ai";

export type AiAction =
  | "rewrite-copy"
  | "regenerate-section"
  | "restyle-section"
  | "regenerate-page"
  | "change-style";

export type InspectorPanelProps = {
  document: ComposeDocument;
  tokens: DesignSystemTokens;
  selectedNode: PageNode | null;
  breakpoint: ComposeDocument["breakpoint"];
  onUpdateDocument: (next: Partial<ComposeDocument>) => void;
  onUpdateContent: (key: keyof PageNodeContent, value: string) => void;
  onUpdateStyle: (key: keyof PageNodeStyle, value: PageNodeStyle[keyof PageNodeStyle]) => void;
  aiPrompt: string;
  onAiPromptChange: (v: string) => void;
  aiLoading: boolean;
  aiError: string | null;
  activeAiActions: Array<{ label: string; action: AiAction }>;
  onApplyAiAction: (action: AiAction) => void;
  exportCode: string | null;
  onPreview: () => void;
  onViewCode: () => void;
  onExport: () => void;
};

// ─── Shared classes ──────────────────────────────────────────────────────────

const inputCls =
  "w-full border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] placeholder:text-[#A0A0A0] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40";

const selectCls =
  "w-full border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40";

const numInputCls =
  "w-full border border-[#E5E5E0] rounded-[2px] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] outline-none transition-colors focus:border-[#D1E4FC] focus:ring-2 focus:ring-[#D1E4FC]/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

// ─── Primitives ──────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-wide text-[#A0A0A0]">
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-[#A0A0A0]">
      {children}
    </span>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <span
          className="block h-4 w-4 shrink-0 rounded-[2px] border border-[#E5E5E0]"
          style={{ background: value || "#transparent" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className={inputCls}
        />
      </div>
    </label>
  );
}

// ─── Tab: Content ────────────────────────────────────────────────────────────

function ContentTab({
  selectedNode,
  onUpdateContent,
}: {
  selectedNode: PageNode;
  onUpdateContent: (key: keyof PageNodeContent, value: string) => void;
}) {
  const textFields = Object.entries(selectedNode.content ?? {})
    .filter(([key]) => !["mediaUrl", "mediaAlt"].includes(key))
    .filter(([, value]) => typeof value === "string");

  return (
    <div className="space-y-4">
      {textFields.length > 0 && (
        <>
          <SectionHeader>Text</SectionHeader>
          <div className="space-y-3">
            {textFields.map(([key, value]) => (
              <label key={key} className="block">
                <FieldLabel>{key}</FieldLabel>
                {String(value).length > 80 ? (
                  <textarea
                    value={String(value)}
                    onChange={(e) => onUpdateContent(key as keyof PageNodeContent, e.target.value)}
                    rows={3}
                    className={cn(inputCls, "resize-none")}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(value)}
                    onChange={(e) => onUpdateContent(key as keyof PageNodeContent, e.target.value)}
                    className={inputCls}
                  />
                )}
              </label>
            ))}
          </div>
        </>
      )}

      <SectionHeader>Media</SectionHeader>
      <div className="space-y-3">
        <label className="block">
          <FieldLabel>URL</FieldLabel>
          <input
            type="text"
            value={selectedNode.content?.mediaUrl ?? ""}
            onChange={(e) => onUpdateContent("mediaUrl", e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </label>
        <label className="block">
          <FieldLabel>Alt Text</FieldLabel>
          <input
            type="text"
            value={selectedNode.content?.mediaAlt ?? ""}
            onChange={(e) => onUpdateContent("mediaAlt", e.target.value)}
            placeholder="Describe the image"
            className={inputCls}
          />
        </label>
      </div>
    </div>
  );
}

// ─── Tab: Style ──────────────────────────────────────────────────────────────

function StyleTab({
  selectedNode,
  onUpdateStyle,
}: {
  selectedNode: PageNode;
  onUpdateStyle: (key: keyof PageNodeStyle, value: PageNodeStyle[keyof PageNodeStyle]) => void;
}) {
  const s = selectedNode.style ?? {};

  return (
    <div>
      {/* Typography */}
      <SectionHeader>Typography</SectionHeader>
      <div className="space-y-3">
        <label className="block">
          <FieldLabel>Font Family</FieldLabel>
          <input
            type="text"
            value={s.fontFamily ?? ""}
            onChange={(e) => onUpdateStyle("fontFamily", e.target.value)}
            placeholder="inherit"
            className={inputCls}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <FieldLabel>Size</FieldLabel>
            <input
              type="number"
              value={s.fontSize ?? ""}
              onChange={(e) => onUpdateStyle("fontSize", Number(e.target.value || 0))}
              className={numInputCls}
            />
          </label>
          <label className="block">
            <FieldLabel>Weight</FieldLabel>
            <select
              value={String(s.fontWeight ?? "")}
              onChange={(e) => onUpdateStyle("fontWeight", Number(e.target.value || 400))}
              className={selectCls}
            >
              <option value="">Auto</option>
              <option value="300">300 Light</option>
              <option value="400">400 Regular</option>
              <option value="500">500 Medium</option>
              <option value="600">600 Semi</option>
              <option value="700">700 Bold</option>
              <option value="800">800 Extra</option>
            </select>
          </label>
          <label className="block">
            <FieldLabel>Line Height</FieldLabel>
            <input
              type="number"
              step="0.05"
              value={s.lineHeight ?? ""}
              onChange={(e) => onUpdateStyle("lineHeight", Number(e.target.value || 0))}
              className={numInputCls}
            />
          </label>
          <label className="block">
            <FieldLabel>Spacing</FieldLabel>
            <input
              type="number"
              step="0.1"
              value={s.letterSpacing ?? ""}
              onChange={(e) => onUpdateStyle("letterSpacing", Number(e.target.value || 0))}
              className={numInputCls}
            />
          </label>
        </div>
      </div>

      {/* Colors */}
      <SectionHeader>Colors</SectionHeader>
      <div className="grid grid-cols-2 gap-2">
        <ColorField label="Background" value={String(s.background ?? "")} onChange={(v) => onUpdateStyle("background", v)} />
        <ColorField label="Foreground" value={String(s.foreground ?? "")} onChange={(v) => onUpdateStyle("foreground", v)} />
        <ColorField label="Border" value={String(s.borderColor ?? "")} onChange={(v) => onUpdateStyle("borderColor", v)} />
        <ColorField label="Accent" value={String(s.accent ?? "")} onChange={(v) => onUpdateStyle("accent", v)} />
      </div>
      <div className="mt-2">
        <label className="block">
          <FieldLabel>Border Radius</FieldLabel>
          <input
            type="number"
            value={s.borderRadius ?? ""}
            onChange={(e) => onUpdateStyle("borderRadius", Number(e.target.value || 0))}
            className={numInputCls}
          />
        </label>
      </div>

      {/* Effects */}
      <SectionHeader>Effects</SectionHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <FieldLabel>Opacity</FieldLabel>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={s.opacity ?? ""}
              onChange={(e) => onUpdateStyle("opacity", Number(e.target.value || 0))}
              className={numInputCls}
            />
          </label>
          <label className="block">
            <FieldLabel>Blur</FieldLabel>
            <input
              type="number"
              value={s.blur ?? ""}
              onChange={(e) => onUpdateStyle("blur", Number(e.target.value || 0))}
              className={numInputCls}
            />
          </label>
        </div>
        <label className="block">
          <FieldLabel>Shadow</FieldLabel>
          <select
            value={s.shadow ?? "none"}
            onChange={(e) => onUpdateStyle("shadow", e.target.value as PageNodeStyle["shadow"])}
            className={selectCls}
          >
            <option value="none">None</option>
            <option value="soft">Soft</option>
            <option value="medium">Medium</option>
          </select>
        </label>
      </div>
    </div>
  );
}

// ─── Tab: Layout ─────────────────────────────────────────────────────────────

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-[2px] border border-[#E5E5E0] bg-[#F5F5F0] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-[2px] px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors",
            value === opt.value
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-[#A0A0A0] hover:text-[#6B6B6B]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PaddingBoxDiagram({
  top,
  right,
  bottom,
  left,
  onChangeTop,
  onChangeRight,
  onChangeBottom,
  onChangeLeft,
}: {
  top: number;
  right: number;
  bottom: number;
  left: number;
  onChangeTop: (v: number) => void;
  onChangeRight: (v: number) => void;
  onChangeBottom: (v: number) => void;
  onChangeLeft: (v: number) => void;
}) {
  const boxInput =
    "w-[42px] border border-[#E5E5E0] rounded-[2px] bg-white px-1 py-0.5 text-[11px] text-center text-[#1A1A1A] outline-none focus:border-[#D1E4FC] focus:ring-1 focus:ring-[#D1E4FC]/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";
  return (
    <div className="flex flex-col items-center gap-1 rounded-[4px] border border-[#E5E5E0] bg-[#FAFAF8] p-2">
      <input type="number" value={top || ""} onChange={(e) => onChangeTop(Number(e.target.value || 0))} className={boxInput} placeholder="0" />
      <div className="flex items-center gap-1">
        <input type="number" value={left || ""} onChange={(e) => onChangeLeft(Number(e.target.value || 0))} className={boxInput} placeholder="0" />
        <div className="h-6 w-10 rounded-[2px] border border-dashed border-[#D1E4FC] bg-white" />
        <input type="number" value={right || ""} onChange={(e) => onChangeRight(Number(e.target.value || 0))} className={boxInput} placeholder="0" />
      </div>
      <input type="number" value={bottom || ""} onChange={(e) => onChangeBottom(Number(e.target.value || 0))} className={boxInput} placeholder="0" />
    </div>
  );
}

function LayoutTab({
  selectedNode,
  breakpoint,
  onUpdateStyle,
}: {
  selectedNode: PageNode;
  breakpoint: ComposeDocument["breakpoint"];
  onUpdateStyle: (key: keyof PageNodeStyle, value: PageNodeStyle[keyof PageNodeStyle]) => void;
}) {
  const s = selectedNode.style ?? {};

  return (
    <div>
      {/* Breakpoint label */}
      <div className="mb-4 rounded-[4px] border border-[#D1E4FC] bg-[#D1E4FC]/20 px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-[#4B57DB]">
          Editing {breakpoint} overrides
        </span>
      </div>

      <SectionHeader>Size</SectionHeader>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <FieldLabel>Width</FieldLabel>
          <input
            type="number"
            value={String(s.maxWidth ?? "")}
            onChange={(e) => onUpdateStyle("maxWidth", Number(e.target.value || 0))}
            placeholder="auto"
            className={numInputCls}
          />
        </label>
        <label className="block">
          <FieldLabel>Height</FieldLabel>
          <input
            type="number"
            value={String(s.minHeight ?? "")}
            onChange={(e) => onUpdateStyle("minHeight", Number(e.target.value || 0))}
            placeholder="auto"
            className={numInputCls}
          />
        </label>
      </div>

      <SectionHeader>Display</SectionHeader>
      <SegmentedControl
        value={s.direction ?? "column"}
        options={[
          { value: "column", label: "Column" },
          { value: "row", label: "Row" },
        ]}
        onChange={(v) => onUpdateStyle("direction", v as PageNodeStyle["direction"])}
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <FieldLabel>Justify</FieldLabel>
          <select
            value={s.justify ?? "start"}
            onChange={(e) => onUpdateStyle("justify", e.target.value as PageNodeStyle["justify"])}
            className={selectCls}
          >
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
            <option value="between">Between</option>
          </select>
        </label>
        <label className="block">
          <FieldLabel>Align</FieldLabel>
          <select
            value={s.align ?? "left"}
            onChange={(e) => onUpdateStyle("align", e.target.value as PageNodeStyle["align"])}
            className={selectCls}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="block">
          <FieldLabel>Gap</FieldLabel>
          <input
            type="number"
            value={String(s.gap ?? "")}
            onChange={(e) => onUpdateStyle("gap", Number(e.target.value || 0))}
            className={numInputCls}
          />
        </label>
        <label className="block">
          <FieldLabel>Columns</FieldLabel>
          <input
            type="number"
            value={s.columns ?? ""}
            onChange={(e) => onUpdateStyle("columns", Number(e.target.value || 0))}
            className={numInputCls}
          />
        </label>
      </div>

      <SectionHeader>Padding</SectionHeader>
      <PaddingBoxDiagram
        top={s.paddingY ?? 0}
        right={s.paddingX ?? 0}
        bottom={s.paddingY ?? 0}
        left={s.paddingX ?? 0}
        onChangeTop={(v) => onUpdateStyle("paddingY", v)}
        onChangeRight={(v) => onUpdateStyle("paddingX", v)}
        onChangeBottom={(v) => onUpdateStyle("paddingY", v)}
        onChangeLeft={(v) => onUpdateStyle("paddingX", v)}
      />
    </div>
  );
}

// ─── Tab: AI ─────────────────────────────────────────────────────────────────

function AiTab({
  selectedNode,
  tokens,
  aiPrompt,
  onAiPromptChange,
  aiLoading,
  aiError,
  activeAiActions,
  onApplyAiAction,
}: {
  selectedNode: PageNode;
  tokens: DesignSystemTokens;
  aiPrompt: string;
  onAiPromptChange: (v: string) => void;
  aiLoading: boolean;
  aiError: string | null;
  activeAiActions: Array<{ label: string; action: AiAction }>;
  onApplyAiAction: (action: AiAction) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Context hint */}
      <div className="rounded-[4px] border border-[#E5E5E0] bg-[#FAFAF8] px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-[#6B6B6B]">
          {selectedNode.type === "page"
            ? "Page selected — regenerate the full direction."
            : selectedNode.type === "section"
            ? "Section selected — rewrite, restyle, or regenerate this slice."
            : "Block selected — targeted content or style changes."}
        </p>
      </div>

      {/* Prompt */}
      <label className="block">
        <FieldLabel>AI Prompt</FieldLabel>
        <textarea
          value={aiPrompt}
          onChange={(e) => onAiPromptChange(e.target.value)}
          rows={3}
          placeholder="Describe changes..."
          className={cn(inputCls, "resize-none")}
        />
      </label>

      {/* Actions */}
      <div className="space-y-1.5">
        {activeAiActions.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={aiLoading}
            onClick={() => onApplyAiAction(item.action)}
            className="flex w-full items-center justify-start rounded-[4px] border border-[#E5E5E0] px-3 py-2 text-[12px] text-[#6B6B6B] transition-colors hover:border-[#D1E4FC] hover:text-[#4B57DB] disabled:opacity-40"
          >
            {item.label}
          </button>
        ))}
      </div>

      {aiError && (
        <div className="rounded-[4px] border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">
          {aiError}
        </div>
      )}

      {/* System context */}
      <div className="rounded-[4px] border border-[#E5E5E0] p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-[#A0A0A0]">
          System Context
        </p>
        <div className="mt-2 flex gap-1.5">
          {[
            tokens.colors.primary,
            tokens.colors.secondary,
            tokens.colors.accent,
            tokens.colors.background,
            tokens.colors.surface,
          ].map((color) => (
            <span
              key={color}
              className="block h-4 w-4 rounded-[2px] border border-[#E5E5E0]"
              style={{ background: color }}
            />
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] text-[#A0A0A0]">{tokens.typography.fontFamily}</p>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function InspectorPanel({
  document,
  tokens,
  selectedNode,
  breakpoint,
  onUpdateDocument,
  onUpdateContent,
  onUpdateStyle,
  aiPrompt,
  onAiPromptChange,
  aiLoading,
  aiError,
  activeAiActions,
  onApplyAiAction,
  exportCode,
  onPreview,
  onViewCode,
  onExport,
}: InspectorPanelProps) {
  const tabs: Array<{ value: InspectorTabValue; label: string }> = [
    { value: "content", label: "Content" },
    { value: "style", label: "Style" },
    { value: "layout", label: "Layout" },
    { value: "ai", label: "AI" },
  ];

  const activeTab = (document.inspectorTab === "effects"
    ? "style"
    : document.inspectorTab === "content" ||
      document.inspectorTab === "style" ||
      document.inspectorTab === "layout" ||
      document.inspectorTab === "ai"
    ? document.inspectorTab
    : "content") as InspectorTabValue;

  function setTab(tab: InspectorTabValue) {
    onUpdateDocument({ inspectorTab: tab });
  }

  return (
    <div className="flex h-full w-[280px] flex-col overflow-hidden border-l border-[#E5E5E0] bg-white">
      {/* ── Tab bar ── */}
      <div className="shrink-0 flex border-b border-[#E5E5E0] px-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setTab(tab.value)}
            className={cn(
              "px-3 py-2 text-[11px] font-medium transition-colors",
              activeTab === tab.value
                ? "text-[#4B57DB] border-b-2 border-[#4B57DB]"
                : "text-[#A0A0A0] hover:text-[#6B6B6B]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!selectedNode ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[13px] text-[#A0A0A0]">
              Select a layer to inspect
            </p>
            <p className="mt-1 text-[11px] text-[#A0A0A0]">
              Click on the canvas or pick from the Layers panel
            </p>
          </div>
        ) : (
          <>
            {/* Node identity */}
            <div className="mb-3 border-b border-[#E5E5E0] pb-3">
              <p className="truncate text-[13px] font-medium text-[#1A1A1A]">
                {selectedNode.name}
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-[#A0A0A0]">
                {selectedNode.type}
              </p>
            </div>

            {activeTab === "content" && (
              <ContentTab selectedNode={selectedNode} onUpdateContent={onUpdateContent} />
            )}
            {activeTab === "style" && (
              <StyleTab selectedNode={selectedNode} onUpdateStyle={onUpdateStyle} />
            )}
            {activeTab === "layout" && (
              <LayoutTab selectedNode={selectedNode} breakpoint={breakpoint} onUpdateStyle={onUpdateStyle} />
            )}
            {activeTab === "ai" && (
              <AiTab
                selectedNode={selectedNode}
                tokens={tokens}
                aiPrompt={aiPrompt}
                onAiPromptChange={onAiPromptChange}
                aiLoading={aiLoading}
                aiError={aiError}
                activeAiActions={activeAiActions}
                onApplyAiAction={onApplyAiAction}
              />
            )}
          </>
        )}
      </div>

      {/* ── Bottom action bar ── */}
      <div className="shrink-0 flex items-center gap-2 border-t border-[#E5E5E0] px-4 py-3">
        <button
          type="button"
          onClick={onViewCode}
          disabled={!exportCode}
          className="flex h-8 flex-1 items-center justify-center rounded-[4px] border border-[#E5E5E0] text-[12px] text-[#6B6B6B] transition-colors hover:border-[#D1E4FC] hover:text-[#4B57DB] disabled:opacity-40"
        >
          View Code
        </button>
        <button
          type="button"
          onClick={exportCode ? onExport : onPreview}
          className="flex h-8 flex-1 items-center justify-center rounded-[4px] bg-[#4B57DB] text-[12px] font-medium text-white transition-colors hover:bg-[#3D49C7]"
        >
          Export
        </button>
      </div>
    </div>
  );
}
