"use client";

import type { DesignSystemTokens } from "@/lib/canvas/generate-system";
import type { ImageAnalysis } from "@/lib/canvas/analyze-images";
import type { TasteProfile } from "@/types/taste-profile";
import type {
  CanvasStage,
  ComposeDocument,
  GeneratedVariant,
} from "@/lib/canvas/compose";
import type { SiteType } from "@/lib/canvas/templates";

export type StoredProject = {
  id: string;
  name: string;
  brief: string;
  color: string;
  createdAt: string;
};

export type StoredProjectFont = {
  family: string;
  source: "google" | "fontshare";
  category:
    | "sans-serif"
    | "serif"
    | "display"
    | "handwriting"
    | "monospace";
};

export type StoredReference = {
  id: string;
  imageUrl: string;
  source: "upload" | "arena" | "pinterest" | "url";
  sourceUrl?: string;
  title?: string;
  addedAt: string;
  projectId: string;
};

export type StoredTask = {
  id: string;
  text: string;
  projectId: string;
  createdAt: string;
  completed: boolean;
};

export type StoredGeneratedSite = {
  code: string;
  name: string;
  prompt: string;
  siteType?: string;
  updatedAt: string;
};

export type ProjectCanvasState = {
  stage?: CanvasStage;
  referenceSetName?: string;
  analysis?: ImageAnalysis | null;
  tasteProfile?: TasteProfile | null;
  designTokens?: DesignSystemTokens | null;
  designSystemMarkdown?: string;
  componentPrompt?: string;
  siteType?: SiteType;
  generatedVariants?: GeneratedVariant[];
  selectedVariantId?: string | null;
  composeDocument?: ComposeDocument | null;
  generatedSite?: StoredGeneratedSite | null;
};

export type ProjectState = {
  coverImage?: string | null;
  notes?: string;
  palette?: string[];
  typography?: {
    headingFont?: StoredProjectFont;
    bodyFont?: StoredProjectFont;
  };
  taskPanelExpanded?: boolean;
  canvas?: ProjectCanvasState;
  updatedAt?: string;
};

export const PROJECTS_UPDATED_EVENT = "projects-updated";
export const PROJECT_REFERENCES_UPDATED_EVENT = "project-references-updated";
export const PROJECT_STATE_UPDATED_EVENT = "project-state-updated";
export const PROJECT_TASKS_UPDATED_EVENT = "project-tasks-updated";

const PROJECTS_KEY = "studio-os:projects";
const TASKS_KEY = "studio-os-tasks";
const REFERENCES_PREFIX = "studio-os:references:";
const PROJECT_STATE_PREFIX = "studio-os:project-state:";
const LEGACY_COVER_PREFIX = "studio-os:cover:";
const LEGACY_CANVAS_SYSTEM_PREFIX = "studio-os:canvas-system:";
const COMPOSE_WORKSPACE_PREFIX = "studio-os:compose-workspace:";
const CANVAS_SESSION_PREFIX = "studio-os:canvas-session:";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function emit(eventName: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(eventName));
}

function referencesKey(projectId: string) {
  return `${REFERENCES_PREFIX}${projectId}`;
}

function projectStateKey(projectId: string) {
  return `${PROJECT_STATE_PREFIX}${projectId}`;
}

function legacyCoverKey(projectId: string) {
  return `${LEGACY_COVER_PREFIX}${projectId}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getProjects(): StoredProject[] {
  const storage = getStorage();
  return safeParse<StoredProject[]>(storage?.getItem(PROJECTS_KEY) ?? null, []);
}

export function getProjectById(projectId: string): StoredProject | null {
  return getProjects().find((project) => project.id === projectId) ?? null;
}

export function uniqueProjectSlug(name: string): string {
  const base = slugify(name);
  const existing = new Set(getProjects().map((project) => project.id));
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function saveProject(project: StoredProject) {
  const storage = getStorage();
  if (!storage) return;
  const nextProjects = [
    project,
    ...getProjects().filter((existing) => existing.id !== project.id),
  ];
  storage.setItem(PROJECTS_KEY, JSON.stringify(nextProjects));
  emit(PROJECTS_UPDATED_EVENT);
}

export function deleteProject(projectId: string) {
  const storage = getStorage();
  if (!storage) return;

  const nextProjects = getProjects().filter((project) => project.id !== projectId);
  storage.setItem(PROJECTS_KEY, JSON.stringify(nextProjects));

  storage.removeItem(referencesKey(projectId));
  storage.removeItem(projectStateKey(projectId));
  storage.removeItem(legacyCoverKey(projectId));
  storage.removeItem(`${LEGACY_CANVAS_SYSTEM_PREFIX}${projectId}`);
  storage.removeItem(`${COMPOSE_WORKSPACE_PREFIX}${projectId}`);
  storage.removeItem(`${CANVAS_SESSION_PREFIX}${projectId}`);

  const otherTasks = getAllTasks().filter((task) => task.projectId !== projectId);
  storage.setItem(TASKS_KEY, JSON.stringify(otherTasks));

  emit(PROJECTS_UPDATED_EVENT);
  emit(PROJECT_REFERENCES_UPDATED_EVENT);
  emit(PROJECT_STATE_UPDATED_EVENT);
  emit(PROJECT_TASKS_UPDATED_EVENT);
}

function normalizeReference(
  value: unknown,
  projectId: string
): StoredReference | null {
  if (!value || typeof value !== "object") return null;
  const ref = value as Partial<StoredReference> & {
    url?: string;
    thumbnail?: string;
    name?: string;
    tags?: string[];
  };

  const imageUrl = ref.imageUrl ?? ref.url ?? ref.thumbnail;
  if (typeof imageUrl !== "string" || imageUrl.length === 0) return null;

  const safeSource =
    ref.source === "upload" ||
    ref.source === "arena" ||
    ref.source === "pinterest" ||
    ref.source === "url"
      ? ref.source
      : "url";

  return {
    id:
      typeof ref.id === "string" && ref.id.length > 0
        ? ref.id
        : `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    imageUrl,
    source: safeSource,
    sourceUrl: ref.sourceUrl,
    title:
      typeof ref.title === "string"
        ? ref.title
        : typeof ref.name === "string"
        ? ref.name
        : "Reference",
    addedAt:
      typeof ref.addedAt === "string"
        ? ref.addedAt
        : new Date().toISOString(),
    projectId:
      typeof ref.projectId === "string" && ref.projectId.length > 0
        ? ref.projectId
        : projectId,
  };
}

export function listProjectReferences(projectId: string): StoredReference[] {
  const storage = getStorage();
  if (!storage) return [];
  const parsed = safeParse<unknown[]>(
    storage.getItem(referencesKey(projectId)),
    []
  );
  return parsed
    .map((item) => normalizeReference(item, projectId))
    .filter((item): item is StoredReference => item !== null);
}

export function setProjectReferences(
  projectId: string,
  references: StoredReference[]
) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(referencesKey(projectId), JSON.stringify(references));
  emit(PROJECT_REFERENCES_UPDATED_EVENT);
}

export function createProjectReference(
  projectId: string,
  reference: StoredReference
) {
  setProjectReferences(projectId, [reference, ...listProjectReferences(projectId)]);
}

export function appendProjectReferences(
  projectId: string,
  references: StoredReference[]
) {
  setProjectReferences(projectId, [...references, ...listProjectReferences(projectId)]);
}

function legacyCanvasTokens(projectId: string): DesignSystemTokens | null {
  const storage = getStorage();
  if (!storage) return null;
  return safeParse<DesignSystemTokens | null>(
    storage.getItem(`${LEGACY_CANVAS_SYSTEM_PREFIX}${projectId}`),
    null
  );
}

export function getProjectState(projectId: string): ProjectState {
  const storage = getStorage();
  if (!storage) return {};

  const state = safeParse<ProjectState>(storage.getItem(projectStateKey(projectId)), {});
  const legacyCover = storage.getItem(legacyCoverKey(projectId));
  const legacyTokens = legacyCanvasTokens(projectId);

  return {
    ...state,
    coverImage: state.coverImage ?? legacyCover ?? null,
    canvas: {
      ...state.canvas,
      designTokens: state.canvas?.designTokens ?? legacyTokens ?? null,
    },
  };
}

// Strip large fields before writing to localStorage to avoid QuotaExceededError.
// compiledCode (~40KB per variant) is kept in React state for preview rendering
// but stripped here since it can be regenerated on demand.
function sanitizeForStorage(state: ProjectState): ProjectState {
  if (!state.canvas) return state;

  const canvas = { ...state.canvas };

  if (canvas.generatedVariants) {
    canvas.generatedVariants = canvas.generatedVariants.map((v) =>
      v.compiledCode ? { ...v, compiledCode: null } : v
    );
  }

  if (canvas.generatedSite?.code) {
    canvas.generatedSite = { ...canvas.generatedSite, code: "" };
  }

  return { ...state, canvas };
}

export function upsertProjectState(
  projectId: string,
  nextState: Partial<ProjectState>
) {
  const storage = getStorage();
  if (!storage) return;

  const current = getProjectState(projectId);
  const merged: ProjectState = {
    ...current,
    ...nextState,
    typography: {
      ...current.typography,
      ...nextState.typography,
    },
    canvas: {
      ...current.canvas,
      ...nextState.canvas,
    },
    updatedAt: new Date().toISOString(),
  };

  if (typeof nextState.coverImage !== "undefined") {
    if (nextState.coverImage) storage.setItem(legacyCoverKey(projectId), nextState.coverImage);
    else storage.removeItem(legacyCoverKey(projectId));
  }

  if (nextState.canvas?.designTokens) {
    storage.setItem(
      `${LEGACY_CANVAS_SYSTEM_PREFIX}${projectId}`,
      JSON.stringify(nextState.canvas.designTokens)
    );
  }

  try {
    storage.setItem(projectStateKey(projectId), JSON.stringify(sanitizeForStorage(merged)));
  } catch (e) {
    // Last-resort: if quota still exceeded even after sanitization (e.g. large
    // analysis object or many variants), drop the canvas state entirely and
    // keep the rest of the project data intact.
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("[project-store] localStorage quota exceeded; dropping canvas state for", projectId);
      const fallback: ProjectState = { ...merged, canvas: undefined };
      try {
        storage.setItem(projectStateKey(projectId), JSON.stringify(fallback));
      } catch {
        // Nothing more we can do
      }
    }
  }
  emit(PROJECT_STATE_UPDATED_EVENT);
}

export function getProjectCover(projectId: string): string | null {
  return getProjectState(projectId).coverImage ?? null;
}

export function setProjectCover(projectId: string, imageUrl: string | null) {
  upsertProjectState(projectId, { coverImage: imageUrl });
  emit(PROJECTS_UPDATED_EVENT);
}

export function getProjectTasks(projectId: string): StoredTask[] {
  const storage = getStorage();
  if (!storage) return [];
  const tasks = safeParse<StoredTask[]>(storage.getItem(TASKS_KEY), []);
  return tasks.filter((task) => task.projectId === projectId);
}

export function getAllTasks(): StoredTask[] {
  const storage = getStorage();
  return safeParse<StoredTask[]>(storage?.getItem(TASKS_KEY) ?? null, []);
}

export function setProjectTasks(projectId: string, tasks: StoredTask[]) {
  const storage = getStorage();
  if (!storage) return;
  const otherTasks = getAllTasks().filter((task) => task.projectId !== projectId);
  storage.setItem(TASKS_KEY, JSON.stringify([...otherTasks, ...tasks]));
  emit(PROJECT_TASKS_UPDATED_EVENT);
}

export function appendProjectTask(task: StoredTask) {
  setProjectTasks(task.projectId, [...getProjectTasks(task.projectId), task]);
}

export function getProjectTaskPanelExpanded(projectId: string): boolean {
  return Boolean(getProjectState(projectId).taskPanelExpanded);
}

export function setProjectTaskPanelExpanded(projectId: string, expanded: boolean) {
  upsertProjectState(projectId, { taskPanelExpanded: expanded });
}
