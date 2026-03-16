"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { DitherSurface } from "@/components/ui/dither-surface";
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

// ─── Shared input style ───────────────────────────────────────────────────────

const inputCls = "h-8 rounded-[2px] border border-[#E5E5E0] bg-white text-xs text-[#1A1A1A] focus-visible:ring-1 focus-visible:ring-[#D1E4FC] focus-visible:border-[#D1E4FC]";
const selectCls = "h-8 w-full rounded-[2px] border border-[#E5E5E0] bg-white px-2 text-xs text-[#1A1A1A] outline-none focus:ring-1 focus:ring-[#D1E4FC] focus:border-[#D1E4FC]";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="mono-kicker">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] text-[#A0A0A0]">{label}</span>
      {children}
    </label>
  );
}

// ─── Tab: Content ─────────────────────────────────────────────────────────────

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
    <div className="space-y-5">
      {textFields.length > 0 && (
        <InspectorSection title="Text">
          {textFields.map(([key, value]) => (
            <FieldRow key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
              {String(value).length > 80 ? (
                <textarea
                  value={String(value)}
                  onChange={(e) => onUpdateContent(key as keyof PageNodeContent, e.target.value)}
                  rows={3}
                  className="w-full rounded-[2px] border border-[#E5E5E0] bg-white px-3 py-2 text-xs text-[#1A1A1A] outline-none resize-none focus:ring-1 focus:ring-[#D1E4FC] focus:border-[#D1E4FC]"
                />
              ) : (
                <Input
                  value={String(value)}
                  onChange={(e) => onUpdateContent(key as keyof PageNodeContent, e.target.value)}
                  className={inputCls}
                />
              )}
            </FieldRow>
          ))}
        </InspectorSection>
      )}

      <InspectorSection title="Media">
        <FieldRow label="URL">
          <Input
            value={selectedNode.content?.mediaUrl ?? ""}
            onChange={(e) => onUpdateContent("mediaUrl", e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="Alt Text">
          <Input
            value={selectedNode.content?.mediaAlt ?? ""}
            onChange={(e) => onUpdateContent("mediaAlt", e.target.value)}
            placeholder="Describe the image"
            className={inputCls}
          />
        </FieldRow>
      </InspectorSection>
    </div>
  );
}

// ─── Tab: Style (Typography + Surface + Effects merged) ───────────────────────

function StyleTab({
  selectedNode,
  onUpdateStyle,
}: {
  selectedNode: PageNode;
  onUpdateStyle: (key: keyof PageNodeStyle, value: PageNodeStyle[keyof PageNodeStyle]) => void;
}) {
  return (
    <div className="space-y-5">
      <InspectorSection title="Typography">
        <FieldRow label="Font Family">
          <Input
            value={selectedNode.style?.fontFamily ?? ""}
            onChange={(e) => onUpdateStyle("fontFamily", e.target.value)}
            placeholder="inherit"
            className={inputCls}
          />
        </FieldRow>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["fontSize", "Size", "number"],
            ["fontWeight", "Weight", "number"],
            ["lineHeight", "Line Height", "number"],
            ["letterSpacing", "Spacing", "number"],
          ] as Array<[keyof PageNodeStyle, string, string]>).map(([key, label, type]) => (
            <FieldRow key={String(key)} label={label}>
              <Input
                type={type}
                step={key === "lineHeight" ? 0.05 : key === "letterSpacing" ? 0.1 : undefined}
                value={String((selectedNode.style ?? {})[key] ?? "")}
                onChange={(e) =>
                  onUpdateStyle(key, type === "number" ? Number(e.target.value || 0) : e.target.value)
                }
                className={inputCls}
              />
            </FieldRow>
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="Surface">
        {([
          ["background", "Background"],
          ["foreground", "Foreground"],
          ["borderColor", "Border"],
          ["accent", "Accent"],
        ] as Array<[keyof PageNodeStyle, string]>).map(([key, label]) => (
          <FieldRow key={String(key)} label={label}>
            <Input
              value={String((selectedNode.style ?? {})[key] ?? "")}
              onChange={(e) => onUpdateStyle(key, e.target.value)}
              className={inputCls}
            />
          </FieldRow>
        ))}
        <FieldRow label="Border Radius">
          <Input
            type="number"
            value={String(selectedNode.style?.borderRadius ?? "")}
            onChange={(e) => onUpdateStyle("borderRadius", Number(e.target.value || 0))}
            className={inputCls}
          />
        </FieldRow>
      </InspectorSection>

      <InspectorSection title="Effects">
        <FieldRow label="Opacity">
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={String(selectedNode.style?.opacity ?? "")}
            onChange={(e) => onUpdateStyle("opacity", Number(e.target.value || 0))}
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="Blur">
          <Input
            type="number"
            value={String(selectedNode.style?.blur ?? "")}
            onChange={(e) => onUpdateStyle("blur", Number(e.target.value || 0))}
            className={inputCls}
          />
        </FieldRow>
        <FieldRow label="Shadow">
          <select
            value={selectedNode.style?.shadow ?? "none"}
            onChange={(e) =>
              onUpdateStyle("shadow", e.target.value as PageNodeStyle["shadow"])
            }
            className={selectCls}
          >
            <option value="none">None</option>
            <option value="soft">Soft</option>
            <option value="medium">Medium</option>
          </select>
        </FieldRow>
      </InspectorSection>
    </div>
  );
}

// ─── Tab: Layout ──────────────────────────────────────────────────────────────

function LayoutTab({
  selectedNode,
  breakpoint,
  onUpdateStyle,
}: {
  selectedNode: PageNode;
  breakpoint: ComposeDocument["breakpoint"];
  onUpdateStyle: (key: keyof PageNodeStyle, value: PageNodeStyle[keyof PageNodeStyle]) => void;
}) {
  return (
    <div className="space-y-5">
      <InspectorSection title="Structure">
        <div className="grid grid-cols-2 gap-2">
          <FieldRow label="Direction">
            <select
              value={selectedNode.style?.direction ?? "column"}
              onChange={(e) =>
                onUpdateStyle("direction", e.target.value as PageNodeStyle["direction"])
              }
              className={selectCls}
            >
              <option value="column">Column</option>
              <option value="row">Row</option>
            </select>
          </FieldRow>
          <FieldRow label="Justify">
            <select
              value={selectedNode.style?.justify ?? "start"}
              onChange={(e) =>
                onUpdateStyle("justify", e.target.value as PageNodeStyle["justify"])
              }
              className={selectCls}
            >
              <option value="start">Start</option>
              <option value="center">Center</option>
              <option value="end">End</option>
              <option value="between">Space Between</option>
            </select>
          </FieldRow>
          <FieldRow label="Align">
            <select
              value={selectedNode.style?.align ?? "left"}
              onChange={(e) =>
                onUpdateStyle("align", e.target.value as PageNodeStyle["align"])
              }
              className={selectCls}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </FieldRow>
          <FieldRow label="Columns">
            <Input
              type="number"
              value={String(selectedNode.style?.columns ?? "")}
              onChange={(e) => onUpdateStyle("columns", Number(e.target.value || 0))}
              className={inputCls}
            />
          </FieldRow>
        </div>
      </InspectorSection>

      <InspectorSection title="Spacing">
        <div className="grid grid-cols-2 gap-2">
          {([
            ["paddingX", "Padding X"],
            ["paddingY", "Padding Y"],
            ["gap", "Gap"],
            ["maxWidth", "Max Width"],
            ["minHeight", "Min Height"],
          ] as Array<[keyof PageNodeStyle, string]>).map(([key, label]) => (
            <FieldRow key={String(key)} label={label}>
              <Input
                type="number"
                value={String((selectedNode.style ?? {})[key] ?? "")}
                onChange={(e) => onUpdateStyle(key, Number(e.target.value || 0))}
                className={inputCls}
              />
            </FieldRow>
          ))}
        </div>
      </InspectorSection>

      <div className="rounded-[4px] border border-[#1E5DF2]/20 bg-[#D1E4FC]/20 px-3 py-2 text-[10px] text-[#1E5DF2]">
        Editing <span className="font-medium">{breakpoint}</span> overrides.
      </div>
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
      <div className="rounded-[4px] border border-[#E5E5E0] bg-[#F5F5F0] px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-[#6B6B6B]">
          {selectedNode.type === "page"
            ? "Page selected — regenerate the full direction while staying in this artboard."
            : selectedNode.type === "section"
            ? "Section selected — rewrite, restyle, or regenerate this slice."
            : "Block selected — targeted content or style changes."}
        </p>
      </div>

      <FieldRow label="AI Prompt">
        <textarea
          value={aiPrompt}
          onChange={(e) => onAiPromptChange(e.target.value)}
          rows={3}
          placeholder="Sharpen the message…"
          className="w-full rounded-[2px] border border-[#E5E5E0] bg-white px-3 py-2 text-xs text-[#1A1A1A] outline-none resize-none focus:ring-1 focus:ring-[#D1E4FC] focus:border-[#D1E4FC]"
        />
      </FieldRow>

      <div className="space-y-1.5">
        {activeAiActions.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={aiLoading}
            onClick={() => onApplyAiAction(item.action)}
            className="flex h-8 w-full items-center justify-start rounded-[4px] border border-[#E5E5E0] bg-white px-3 text-[11px] font-medium text-[#6B6B6B] transition-colors hover:border-[#D1E4FC] hover:text-[#1E5DF2] disabled:opacity-50"
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

      <div className="rounded-[4px] border border-[#E5E5E0] p-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">
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
            <div
              key={color}
              className="h-5 w-5 rounded-sm border border-[#E5E5E0]"
              style={{ background: color }}
            />
          ))}
        </div>
        <p className="mt-2 text-[10px] text-[#A0A0A0]">{tokens.typography.fontFamily}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
    <div className="flex h-full flex-col overflow-hidden border-l border-[#E5E5E0] bg-white surface-panel surface-panel-muted rounded-none border-y-0 border-r-0">

      {/* ── Node identity ── */}
      {selectedNode && (
        <DitherSurface
          patternVariant="grid"
          patternTone="warm"
          patternDensity="sm"
          muted
          className="shrink-0 rounded-none border-x-0 border-t-0 px-4 py-3"
        >
          <p className="truncate text-[13px] font-semibold text-[#1A1A1A]">
            {selectedNode.name}
          </p>
          <p className="mono-kicker mt-0.5">
            {selectedNode.type}
          </p>
        </DitherSurface>
      )}

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex border-b border-[#E5E5E0] bg-white/80 px-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setTab(tab.value)}
            className={cn(
              "relative mr-3 pb-2 pt-2.5 text-[12px] font-medium transition-colors",
              activeTab === tab.value
                ? "text-[#1A1A1A]"
                : "text-[#A0A0A0] hover:text-[#6B6B6B]"
            )}
          >
            {tab.label}
            {activeTab === tab.value && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1E5DF2]" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!selectedNode ? (
          <DitherSurface
            patternVariant="fade"
            patternTone="blue"
            patternDensity="sm"
            muted
            className="flex h-full flex-col items-center justify-center rounded-[4px] px-4 text-center"
          >
            <p className="mono-kicker">
              No Selection
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#A0A0A0]">
              Click a node on the canvas to inspect it.
            </p>
          </DitherSurface>
        ) : (
          <>
            {activeTab === "content" && (
              <ContentTab
                selectedNode={selectedNode}
                onUpdateContent={onUpdateContent}
              />
            )}
            {activeTab === "style" && (
              <StyleTab
                selectedNode={selectedNode}
                onUpdateStyle={onUpdateStyle}
              />
            )}
            {activeTab === "layout" && (
              <LayoutTab
                selectedNode={selectedNode}
                breakpoint={breakpoint}
                onUpdateStyle={onUpdateStyle}
              />
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

      {/* ── Bottom action bar (always visible) ── */}
      <div className="shrink-0 flex items-center gap-2 border-t border-[#E5E5E0] bg-white/80 px-4 py-3">
        <button
          type="button"
          onClick={onViewCode}
          disabled={!exportCode}
          className="flex h-8 flex-1 items-center justify-center rounded-[4px] border border-[#E5E5E0] bg-white text-[12px] font-medium text-[#6B6B6B] transition-colors hover:border-[#D1E4FC] hover:text-[#1E5DF2] disabled:opacity-40"
        >
          View Code
        </button>
        <button
          type="button"
          onClick={exportCode ? onExport : onPreview}
          className="flex h-8 flex-1 items-center justify-center rounded-[4px] bg-[#1E5DF2] text-[12px] font-medium text-white transition-colors hover:bg-[#1A4FD6]"
        >
          Export
        </button>
      </div>
    </div>
  );
}
