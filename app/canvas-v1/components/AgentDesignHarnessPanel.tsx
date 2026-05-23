"use client";

import * as React from "react";
import { Copy, FileJson, ShieldCheck } from "lucide-react";
import {
  buildDesignContract,
  createDefaultProjectContext,
  createVisualReview,
  formatDesignContractMarkdown,
} from "@/lib/canvas/agent-design-contract";
import { getProjectById, getProjectState, upsertProjectState } from "@/lib/project-store";
import { useCanvas } from "@/lib/canvas/canvas-context";
import type { ProjectContext, ProjectStage, VisualReview } from "@/types/agent-design-harness";
import {
  InspectorFieldRow,
  InspectorLabel,
  InspectorSection,
  InspectorTextarea,
  InspectorTextInput,
} from "./inspector/InspectorField";
import { StudioButton } from "@/components/ui/studio-button";

type AgentDesignHarnessPanelProps = {
  projectId?: string;
};

const stageOptions: Array<{ value: ProjectStage; label: string }> = [
  { value: "raw-idea", label: "Raw idea" },
  { value: "moodboard", label: "Moodboard" },
  { value: "working-prototype", label: "Working prototype" },
  { value: "mid-build", label: "Mid-build" },
  { value: "near-launch", label: "Near launch" },
];

const archetypeOptions = [
  "auto",
  "saas-landing",
  "culture-event",
  "dashboard/internal-tool",
  "ai-workflow-tool",
  "marketplace",
  "commerce",
  "portfolio",
  "publication",
  "devtool",
  "mobile-consumer-app",
];

function linesToArray(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function arrayToLines(value: string[] | undefined): string {
  return (value ?? []).join("\n");
}

function mergeContext(base: ProjectContext, patch: Partial<ProjectContext>): ProjectContext {
  return {
    ...base,
    ...patch,
    prototypeUrls: patch.prototypeUrls ?? base.prototypeUrls,
    screenshots: patch.screenshots ?? base.screenshots,
    references: patch.references ?? base.references,
    brandAssets: patch.brandAssets ?? base.brandAssets,
    agentSummaries: patch.agentSummaries ?? base.agentSummaries,
    constraints: patch.constraints ?? base.constraints,
  };
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[4px] border border-[var(--inspector-border)] bg-[var(--inspector-bg)] px-2 py-1.5">
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className="mt-0.5 text-[12px] font-medium tabular-nums text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="truncate text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

export function AgentDesignHarnessPanel({ projectId }: AgentDesignHarnessPanelProps) {
  const { state } = useCanvas();
  const projectName = projectId ? getProjectById(projectId)?.name ?? "Project" : "Project";
  const projectState = projectId ? getProjectState(projectId) : {};
  const existingHarness = projectState.canvas?.agentHarness;
  const baseContext = React.useMemo(
    () =>
      createDefaultProjectContext({
        brief: state.prompt.value,
        appArchetype: state.prompt.siteType,
      }),
    [state.prompt.siteType, state.prompt.value]
  );

  const [context, setContext] = React.useState<ProjectContext>(() =>
    mergeContext(baseContext, existingHarness?.projectContext ?? {})
  );
  const [saved, setSaved] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState<string | null>(null);
  const [reviewScreenshot, setReviewScreenshot] = React.useState("");
  const [reviewScreenId, setReviewScreenId] = React.useState("");
  const [observedIssues, setObservedIssues] = React.useState("");
  const [latestReview, setLatestReview] = React.useState<VisualReview | null>(
    existingHarness?.visualReviews?.[0] ?? null
  );

  React.useEffect(() => {
    const harness = projectId ? getProjectState(projectId).canvas?.agentHarness : undefined;
    setContext(mergeContext(baseContext, harness?.projectContext ?? {}));
    setLatestReview(harness?.visualReviews?.[0] ?? null);
  }, [baseContext, projectId]);

  const contract = React.useMemo(
    () =>
      buildDesignContract({
        projectId: projectId ?? "local-canvas",
        projectName,
        state,
        tasteProfile: projectState.canvas?.tasteProfile ?? null,
        designTokens: projectState.canvas?.designTokens ?? null,
        projectContext: context,
      }),
    [context, projectId, projectName, projectState.canvas?.designTokens, projectState.canvas?.tasteProfile, state]
  );

  React.useEffect(() => {
    if (!reviewScreenId && contract.screenshotCheckpoints[0]) {
      setReviewScreenId(contract.screenshotCheckpoints[0].screenId);
    }
  }, [contract.screenshotCheckpoints, reviewScreenId]);

  function persistHarness(nextReview?: VisualReview | null) {
    if (!projectId) return;
    const currentHarness = getProjectState(projectId).canvas?.agentHarness;
    const reviews = nextReview
      ? [nextReview, ...(currentHarness?.visualReviews ?? []).filter((review) => review.reviewedAt !== nextReview.reviewedAt)].slice(0, 8)
      : currentHarness?.visualReviews ?? [];
    upsertProjectState(projectId, {
      canvas: {
        agentHarness: {
          projectContext: context,
          latestDesignContract: contract,
          visualReviews: reviews,
        },
      },
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied`);
      window.setTimeout(() => setCopyStatus(null), 1400);
    } catch {
      setCopyStatus("Clipboard unavailable");
    }
  }

  function handleReview() {
    const screenId = reviewScreenId || contract.screenshotCheckpoints[0]?.screenId;
    if (!screenId) return;
    const review = createVisualReview({
      contract,
      screenId,
      sourceScreenshot: reviewScreenshot.trim() || "manual screenshot",
      comparedAgainstArtboard: contract.screenshotCheckpoints.find((item) => item.screenId === screenId)?.artboardId ?? screenId,
      observedIssues: linesToArray(observedIssues),
    });
    setLatestReview(review);
    persistHarness(review);
  }

  const markdown = React.useMemo(() => formatDesignContractMarkdown(contract), [contract]);
  const json = React.useMemo(() => JSON.stringify(contract, null, 2), [contract]);

  return (
    <div className="flex min-h-0 flex-col gap-3 px-3 py-3">
      <div className="rounded-[4px] border border-[var(--inspector-border)] bg-[var(--inspector-surface)] px-2.5 py-2">
        <div className="mb-1 flex items-center gap-2 text-[12px] font-medium text-[var(--text-primary)]">
          <ShieldCheck size={14} strokeWidth={1.7} />
          Design authority loop
        </div>
        <p className="text-pretty text-[11px] leading-relaxed text-[var(--text-secondary)]">
          Capture context, export a strict DesignContract, then review the agent-built screenshot for drift.
        </p>
      </div>

      <InspectorSection label="Project Context">
        <InspectorLabel>Brief</InspectorLabel>
        <InspectorTextarea
          value={context.brief}
          onChange={(event) => setContext((current) => ({ ...current, brief: event.target.value }))}
          placeholder="What is this app trying to become?"
          rows={3}
        />

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <InspectorLabel>Stage</InspectorLabel>
            <select
              value={context.stage}
              onChange={(event) => setContext((current) => ({ ...current, stage: event.target.value as ProjectStage }))}
              className="h-7 w-full rounded-[4px] border border-[var(--inspector-control-border)] bg-[var(--inspector-control-bg)] px-2 text-[11px] text-[var(--inspector-control-text)] outline-none focus:border-[var(--accent)]"
            >
              {stageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <InspectorLabel>Archetype</InspectorLabel>
            <select
              value={context.appArchetype}
              onChange={(event) => setContext((current) => ({ ...current, appArchetype: event.target.value }))}
              className="h-7 w-full rounded-[4px] border border-[var(--inspector-control-border)] bg-[var(--inspector-control-bg)] px-2 text-[11px] text-[var(--inspector-control-text)] outline-none focus:border-[var(--accent)]"
            >
              {archetypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2">
          <InspectorLabel>Audience</InspectorLabel>
          <InspectorTextInput
            value={context.targetAudience}
            onChange={(event) => setContext((current) => ({ ...current, targetAudience: event.target.value }))}
            placeholder="Who is this for?"
          />
        </div>

        <div className="mt-2">
          <InspectorLabel>Prototype URLs</InspectorLabel>
          <InspectorTextarea
            value={arrayToLines(context.prototypeUrls)}
            onChange={(event) => setContext((current) => ({ ...current, prototypeUrls: linesToArray(event.target.value) }))}
            placeholder="One URL per line"
            rows={2}
          />
        </div>

        <div className="mt-2">
          <InspectorLabel>Agent summary</InspectorLabel>
          <InspectorTextarea
            value={arrayToLines(context.agentSummaries)}
            onChange={(event) => setContext((current) => ({ ...current, agentSummaries: linesToArray(event.target.value) }))}
            placeholder="What has the builder agent already made?"
            rows={2}
          />
        </div>

        <div className="mt-2">
          <InspectorLabel>Hard constraints</InspectorLabel>
          <InspectorTextarea
            value={arrayToLines(context.constraints)}
            onChange={(event) => setContext((current) => ({ ...current, constraints: linesToArray(event.target.value) }))}
            placeholder="One constraint per line"
            rows={2}
          />
        </div>

        <StudioButton
          type="button"
          variant="secondary"
          className="mt-2 h-8 w-full text-[12px]"
          onClick={() => persistHarness()}
          disabled={!projectId}
        >
          {saved ? "Saved" : "Save context"}
        </StudioButton>
      </InspectorSection>

      <InspectorSection label="Design Contract">
        <div className="grid grid-cols-3 gap-1.5">
          <MetricPill label="Screens" value={contract.appStructure.screens.length} />
          <MetricPill label="Refs" value={contract.referenceIntent.length} />
          <MetricPill label="Checks" value={contract.antiPatternChecks.length} />
        </div>

        <div className="mt-2 space-y-1.5 rounded-[4px] border border-[var(--inspector-border)] bg-[var(--inspector-bg)] px-2 py-2">
          <StatusRow label="Archetype" value={contract.projectIntent.appArchetype} />
          <StatusRow label="Taste" value={contract.tasteProfile?.archetypeMatch ?? "pending"} />
          <StatusRow label="Tokens" value={contract.designTokens ? "ready" : "pending"} />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <StudioButton
            type="button"
            variant="secondary"
            className="h-8 text-[11px]"
            onClick={() => {
              persistHarness();
              void copyText(markdown, "Markdown");
            }}
          >
            <Copy size={13} strokeWidth={1.6} className="mr-1.5" />
            Markdown
          </StudioButton>
          <StudioButton
            type="button"
            variant="secondary"
            className="h-8 text-[11px]"
            onClick={() => {
              persistHarness();
              void copyText(json, "JSON");
            }}
          >
            <FileJson size={13} strokeWidth={1.6} className="mr-1.5" />
            JSON
          </StudioButton>
        </div>
        {copyStatus && <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">{copyStatus}</p>}
      </InspectorSection>

      <InspectorSection label="Visual Review">
        <InspectorFieldRow label="Screen">
          <select
            value={reviewScreenId}
            onChange={(event) => setReviewScreenId(event.target.value)}
            className="h-7 w-full rounded-[4px] border border-[var(--inspector-control-border)] bg-[var(--inspector-control-bg)] px-2 text-[11px] text-[var(--inspector-control-text)] outline-none focus:border-[var(--accent)]"
          >
            {contract.screenshotCheckpoints.map((checkpoint) => (
              <option key={checkpoint.screenId} value={checkpoint.screenId}>
                {checkpoint.label}
              </option>
            ))}
          </select>
        </InspectorFieldRow>

        <div className="mt-2">
          <InspectorLabel>Screenshot URL or note</InspectorLabel>
          <InspectorTextInput
            value={reviewScreenshot}
            onChange={(event) => setReviewScreenshot(event.target.value)}
            placeholder="Paste screenshot URL or leave manual"
          />
        </div>

        <div className="mt-2">
          <InspectorLabel>Observed drift</InspectorLabel>
          <InspectorTextarea
            value={observedIssues}
            onChange={(event) => setObservedIssues(event.target.value)}
            placeholder="One issue per line, e.g. equal rounded card grid"
            rows={3}
          />
        </div>

        <StudioButton
          type="button"
          variant="primary"
          className="mt-2 h-8 w-full text-[12px]"
          onClick={handleReview}
          disabled={contract.screenshotCheckpoints.length === 0}
        >
          Review screenshot
        </StudioButton>

        {latestReview && (
          <div className="mt-2 space-y-2 rounded-[4px] border border-[var(--inspector-border)] bg-[var(--inspector-bg)] px-2.5 py-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-[var(--text-primary)]">
                {latestReview.passFail === "pass" ? "Pass" : "Needs fixes"}
              </span>
              <span className="tabular-nums text-[var(--text-muted)]">
                {latestReview.contractMatchScore} / 100
              </span>
            </div>
            {latestReview.requiredFixes.length > 0 && (
              <ul className="space-y-1 text-[11px] leading-snug text-[var(--text-secondary)]">
                {latestReview.requiredFixes.slice(0, 3).map((fix) => (
                  <li key={fix}>- {fix}</li>
                ))}
              </ul>
            )}
            <InspectorTextarea
              value={latestReview.recommendedAgentPrompt}
              readOnly
              rows={5}
              aria-label="Recommended agent prompt"
            />
            <StudioButton
              type="button"
              variant="secondary"
              className="h-8 w-full text-[11px]"
              onClick={() => void copyText(latestReview.recommendedAgentPrompt, "Agent prompt")}
            >
              Copy correction prompt
            </StudioButton>
          </div>
        )}
      </InspectorSection>
    </div>
  );
}
