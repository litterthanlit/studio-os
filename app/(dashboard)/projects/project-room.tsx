"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ComposeDocumentView } from "@/app/canvas-v1/components/ComposeDocumentView";
import { getExportArtboard, type GeneratedVariant } from "@/lib/canvas/compose";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import {
  getProjectState,
  listProjectReferences,
  PROJECT_REFERENCES_UPDATED_EVENT,
  PROJECT_STATE_UPDATED_EVENT,
} from "@/lib/project-store";
import type { TasteProfile } from "@/types/taste-profile";
import type { Project } from "./projects-data";

export type { Phase, Project } from "./projects-data";
export { PROJECTS, PHASE_STYLES } from "./projects-data";

type ProjectOverviewTab = "board" | "system" | "site";

const TABS: Array<{ id: ProjectOverviewTab; label: string; subtitle: string }> = [
  { id: "board", label: "Board", subtitle: "References and pinned inspiration" },
  { id: "system", label: "System", subtitle: "Palette, type, and taste direction" },
  { id: "site", label: "Site", subtitle: "Generated directions and compose state" },
];

function formatRelativeTime(value: string | undefined) {
  if (!value) return "Just now";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Just now";
  const diff = Date.now() - timestamp;
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} min ago`;
  if (diff < day) return `${Math.round(diff / hour)}h ago`;
  if (diff < day * 7) return `${Math.round(diff / day)}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(timestamp)
  );
}

function tokenCount(tokens: DesignSystemTokens | null | undefined) {
  if (!tokens) return 0;
  return Object.keys(tokens.colors).length;
}

function fontLabel(font?: { family: string; category?: string }) {
  if (!font) return "Not selected";
  return font.category ? `${font.family} · ${font.category}` : font.family;
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-sm border border-border-primary bg-bg-secondary px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-text-secondary">
      <span className="text-text-primary">{value}</span> {label}
    </div>
  );
}

function EmptyOverviewState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border-primary bg-bg-secondary px-8 py-16 text-center">
      <div className="mb-5 h-12 w-12 rounded-lg border border-border-primary bg-card-bg" />
      <p className="text-lg font-medium text-text-primary">{title}</p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
        {body}
      </p>
    </div>
  );
}

function BoardOverview({ projectId }: { projectId: string }) {
  const [references, setReferences] = React.useState(() => listProjectReferences(projectId));

  React.useEffect(() => {
    setReferences(listProjectReferences(projectId));
  }, [projectId]);

  React.useEffect(() => {
    const sync = () => setReferences(listProjectReferences(projectId));
    window.addEventListener(PROJECT_REFERENCES_UPDATED_EVENT, sync);
    window.addEventListener(PROJECT_STATE_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener(PROJECT_REFERENCES_UPDATED_EVENT, sync);
      window.removeEventListener(PROJECT_STATE_UPDATED_EVENT, sync);
    };
  }, [projectId]);

  if (references.length === 0) {
    return (
      <EmptyOverviewState
        title="No references yet"
        body="Enter Canvas to build the board, import references, and start shaping the project taste."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
            Project board
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
            References at a glance
          </h3>
        </div>
        <p className="text-sm text-text-secondary">
          Editing lives in Canvas. This page is a read-only overview.
        </p>
      </div>
      <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
        {references.map((reference) => (
          <div
            key={reference.id}
            className="group mb-4 break-inside-avoid overflow-hidden rounded-lg border border-border-primary bg-card-bg"
          >
            <div className="relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={reference.imageUrl}
                alt={reference.title || "Reference"}
                className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="rounded-sm border border-white/15 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-white ">
                  {reference.source}
                </span>
                <span className="rounded-sm border border-white/15 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-white ">
                  View in Canvas
                </span>
              </div>
            </div>
            <div className="space-y-2 px-4 py-4">
              <p className="truncate text-sm font-medium text-text-primary">
                {reference.title || "Untitled reference"}
              </p>
              <p className="text-xs text-text-tertiary">
                Added {formatRelativeTime(reference.addedAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasteSnapshot({
  tasteProfile,
}: {
  tasteProfile: TasteProfile;
}) {
  return (
    <div className="rounded-lg border border-border-primary bg-card-bg p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
        Taste profile
      </p>
      <p className="mt-3 text-sm leading-relaxed text-text-primary">
        {tasteProfile.summary}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tasteProfile.adjectives.map((adjective) => (
          <span
            key={adjective}
            className="rounded-sm border border-[#3B5EFC]/20 bg-[#3B5EFC]/8 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[#3B5EFC]"
          >
            {adjective}
          </span>
        ))}
      </div>
      <div className="mt-5 rounded-full bg-bg-secondary p-1">
        <div
          className="h-2 rounded-full bg-[#3B5EFC]"
          style={{ width: `${Math.round((tasteProfile.confidence ?? 0) * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
        Confidence {Math.round((tasteProfile.confidence ?? 0) * 100)}%
      </p>
    </div>
  );
}

function SystemOverview({
  project,
}: {
  project: Project;
}) {
  const [state, setState] = React.useState(() => getProjectState(project.id));

  React.useEffect(() => {
    setState(getProjectState(project.id));
  }, [project.id]);

  React.useEffect(() => {
    const sync = () => setState(getProjectState(project.id));
    window.addEventListener(PROJECT_STATE_UPDATED_EVENT, sync);
    window.addEventListener(PROJECT_REFERENCES_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener(PROJECT_STATE_UPDATED_EVENT, sync);
      window.removeEventListener(PROJECT_REFERENCES_UPDATED_EVENT, sync);
    };
  }, [project.id]);

  const tokens = state.canvas?.designTokens ?? null;
  const palette = state.palette?.length ? state.palette : project.palette;
  const tasteProfile = state.canvas?.tasteProfile ?? null;
  const headingFont = state.typography?.headingFont ?? project.headingFont;
  const bodyFont = state.typography?.bodyFont ?? project.bodyFont;

  if (!tokens && !tasteProfile && palette.length === 0) {
    return (
      <EmptyOverviewState
        title="No system extracted yet"
        body="Enter Canvas to extract palette, typography, and a taste profile from the reference board."
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <div className="rounded-lg border border-border-primary bg-card-bg p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
            Color palette
          </p>
          <div className="mt-4 grid grid-cols-5 gap-3">
            {palette.slice(0, 10).map((color, index) => (
              <div key={`${color}-${index}`} className="space-y-2">
                <div
                  className="aspect-square rounded-lg border border-border-primary"
                  style={{ backgroundColor: color }}
                />
                <p className="truncate text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                  {color}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border-primary bg-card-bg p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
            Typography
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border-primary bg-bg-secondary p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                Heading
              </p>
              <p className="mt-2 text-base font-medium text-text-primary">
                {fontLabel(headingFont)}
              </p>
            </div>
            <div className="rounded-md border border-border-primary bg-bg-secondary p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                Body
              </p>
              <p className="mt-2 text-base font-medium text-text-primary">
                {fontLabel(bodyFont)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {tasteProfile ? <TasteSnapshot tasteProfile={tasteProfile} /> : null}

        <div className="rounded-lg border border-border-primary bg-card-bg p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
            System snapshot
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border-primary bg-bg-secondary p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                Layout bias
              </p>
              <p className="mt-2 text-sm text-text-primary">
                {tasteProfile?.layoutBias.gridBehavior ?? "Awaiting extraction"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Density {tasteProfile?.layoutBias.density ?? "—"} · whitespace {tasteProfile?.layoutBias.whitespaceIntent ?? "—"}
              </p>
            </div>
            <div className="rounded-md border border-border-primary bg-bg-secondary p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                CTA tone
              </p>
              <p className="mt-2 text-sm text-text-primary">
                {tasteProfile?.ctaTone?.style ?? "Awaiting extraction"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {tasteProfile?.imageTreatment.style ?? "No image treatment captured yet"}
              </p>
            </div>
          </div>
          {tokens ? (
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {tokenCount(tokens)} primary tokens are already extracted and available in Canvas.
            </p>
          ) : null}
        </div>

        {tasteProfile?.avoid?.length ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-red-300">
              Avoid
            </p>
            <ul className="mt-3 space-y-2 text-sm text-red-100/80">
              {tasteProfile.avoid.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VariantPreviewCard({
  variant,
  tokens,
}: {
  variant: GeneratedVariant;
  tokens: DesignSystemTokens | null;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-primary bg-card-bg">
      <div className="border-b border-border-primary px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">
              {variant.strategyLabel ?? variant.name}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              {formatRelativeTime(variant.createdAt)}
            </p>
          </div>
          {variant.strategy ? (
            <span className="rounded-sm border border-border-primary bg-bg-secondary px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-text-secondary">
              {variant.strategy}
            </span>
          ) : null}
        </div>
        {variant.description ? (
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            {variant.description}
          </p>
        ) : null}
      </div>
      <div className="bg-bg-secondary p-4">
        <div className="overflow-hidden rounded-[18px] border border-border-primary bg-white">
          {tokens ? (
            <ComposeDocumentView
              pageTree={variant.pageTree}
              tokens={tokens}
              breakpoint="desktop"
              scale={320 / 1440}
              className="pointer-events-none"
            />
          ) : (
            <div className="flex aspect-[16/11] items-center justify-center text-sm text-text-tertiary">
              Preview unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SiteOverview({
  project,
}: {
  project: Project;
}) {
  const [state, setState] = React.useState(() => getProjectState(project.id));

  React.useEffect(() => {
    setState(getProjectState(project.id));
  }, [project.id]);

  React.useEffect(() => {
    const sync = () => setState(getProjectState(project.id));
    window.addEventListener(PROJECT_STATE_UPDATED_EVENT, sync);
    return () => window.removeEventListener(PROJECT_STATE_UPDATED_EVENT, sync);
  }, [project.id]);

  const tokens = state.canvas?.designTokens ?? null;
  const variants = state.canvas?.generatedVariants ?? [];
  const composeDocument = state.canvas?.composeDocument ?? null;
  const exportArtboard = getExportArtboard(composeDocument);
  const exportHistory = [
    composeDocument?.exportArtifact
      ? {
          label: "Compose export",
          detail: composeDocument.exportArtifact.name,
          time: composeDocument.exportArtifact.updatedAt,
        }
      : null,
    state.canvas?.generatedSite
      ? {
          label: "Generated site",
          detail: state.canvas.generatedSite.name,
          time: state.canvas.generatedSite.updatedAt,
        }
      : null,
    variants[0]
      ? {
          label: "Latest variants",
          detail: `${variants.length} directions`,
          time: variants[0].createdAt,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; detail: string; time: string }>;

  if (variants.length === 0 && !exportArtboard) {
    return (
      <EmptyOverviewState
        title="No site output yet"
        body="Enter Canvas to generate variants, choose a direction, and refine it inside Compose."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
              Latest variants
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-text-primary">
              Current directions
            </h3>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {variants.slice(0, 3).map((variant) => (
              <VariantPreviewCard
                key={variant.id}
                variant={variant}
                tokens={tokens}
              />
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-border-primary bg-card-bg p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
              Compose preview
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-border-primary bg-white">
              {exportArtboard && tokens ? (
                <ComposeDocumentView
                  pageTree={exportArtboard.pageTree}
                  tokens={tokens}
                  breakpoint={composeDocument?.breakpoint ?? "desktop"}
                  scale={280 / 1440}
                  className="pointer-events-none"
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center px-6 text-center text-sm text-text-tertiary">
                  Compose preview will appear here after you move a variant into Canvas.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border-primary bg-card-bg p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
              Export history
            </p>
            {exportHistory.length > 0 ? (
              <div className="mt-4 space-y-3">
                {exportHistory.map((item) => (
                  <div
                    key={`${item.label}-${item.time}`}
                    className="rounded-md border border-border-primary bg-bg-secondary p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{item.label}</p>
                        <p className="mt-1 text-xs text-text-secondary">{item.detail}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                        {formatRelativeTime(item.time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                Export activity will appear here once the project is generated or exported from Canvas.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectRoomSections({ project }: { project: Project }) {
  const [activeTab, setActiveTab] = React.useState<ProjectOverviewTab>("board");
  const [state, setState] = React.useState(() => getProjectState(project.id));
  const [referenceCount, setReferenceCount] = React.useState(() => listProjectReferences(project.id).length);

  React.useEffect(() => {
    setState(getProjectState(project.id));
    setReferenceCount(listProjectReferences(project.id).length);
  }, [project.id]);

  React.useEffect(() => {
    const sync = () => {
      setState(getProjectState(project.id));
      setReferenceCount(listProjectReferences(project.id).length);
    };
    window.addEventListener(PROJECT_STATE_UPDATED_EVENT, sync);
    window.addEventListener(PROJECT_REFERENCES_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener(PROJECT_STATE_UPDATED_EVENT, sync);
      window.removeEventListener(PROJECT_REFERENCES_UPDATED_EVENT, sync);
    };
  }, [project.id]);

  const variants = state.canvas?.generatedVariants ?? [];
  const tokens = state.canvas?.designTokens ?? null;
  const lastEdited = formatRelativeTime(state.updatedAt ?? project.lastActivity);

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-wrap items-center gap-2">
        <StatPill label="references" value={String(referenceCount)} />
        <StatPill label="tokens" value={String(tokenCount(tokens))} />
        <StatPill label="variants" value={String(variants.length)} />
        <StatPill label="last edited" value={lastEdited} />
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-sm border px-4 py-2 text-left transition-colors",
                activeTab === tab.id
                  ? "border-[#3B5EFC]/30 bg-[#3B5EFC]/10 text-text-primary"
                  : "border-border-primary bg-bg-secondary text-text-secondary hover:text-text-primary"
              )}
            >
              <p className="text-[11px] uppercase tracking-[0.14em]">{tab.label}</p>
            </button>
          ))}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
            {TABS.find((tab) => tab.id === activeTab)?.subtitle}
          </p>
        </div>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {activeTab === "board" ? <BoardOverview projectId={project.id} /> : null}
        {activeTab === "system" ? <SystemOverview project={project} /> : null}
        {activeTab === "site" ? <SiteOverview project={project} /> : null}
      </motion.div>
    </div>
  );
}
