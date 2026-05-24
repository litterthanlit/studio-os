/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Args = {
  inputDir: string;
  outputDir: string;
  dryRun: boolean;
};

const TABLES = [
  "profiles",
  "projects",
  "boards",
  "references",
  "inspiration_images",
  "inspiration_likes",
  "inspiration_daily",
  "published_exports",
  "shares",
  "integrations",
] as const;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    rows[table] = await readJsonArray(path.join(args.inputDir, `${table}.json`));
  }

  const output = {
    users: rows.profiles.map(mapProfile),
    projects: rows.projects.map(mapProject),
    boards: rows.boards.map(mapBoard),
    references: rows.references.map(mapReference),
    inspirationImages: rows.inspiration_images.map(mapInspirationImage),
    inspirationLikes: rows.inspiration_likes.map(mapInspirationLike),
    inspirationDaily: rows.inspiration_daily.map(mapInspirationDaily),
    publishedExports: rows.published_exports.map(mapPublishedExport),
    shareLinks: rows.shares.map(mapShareLink),
    integrationsReauthRequired: rows.integrations.map(redactIntegration),
  };

  const counts = Object.fromEntries(
    Object.entries(output).map(([name, value]) => [name, Array.isArray(value) ? value.length : 0])
  );

  if (args.dryRun) {
    console.log(JSON.stringify({ dryRun: true, counts }, null, 2));
    return;
  }

  await mkdir(args.outputDir, { recursive: true });
  for (const [name, docs] of Object.entries(output)) {
    await writeFile(path.join(args.outputDir, `${name}.json`), JSON.stringify(docs, null, 2));
  }
  await writeFile(path.join(args.outputDir, "counts.json"), JSON.stringify(counts, null, 2));
  console.log(JSON.stringify({ dryRun: false, outputDir: args.outputDir, counts }, null, 2));
}

function parseArgs(argv: string[]): Args {
  const inputDir = readFlag(argv, "--input", "tmp/supabase-export");
  const outputDir = readFlag(argv, "--output", "tmp/convex-import");
  return {
    inputDir,
    outputDir,
    dryRun: argv.includes("--dry-run"),
  };
}

function readFlag(argv: string[], flag: string, fallback: string) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] ?? fallback : fallback;
}

async function readJsonArray(file: string) {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error(`${file} must contain an array`);
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function t(value: unknown) {
  return value ? new Date(String(value)).getTime() : Date.now();
}

function mapProfile(row: any) {
  return {
    legacySupabaseId: row.id,
    tokenIdentifier: `migration:${row.id}`,
    subject: row.id,
    email: row.email ?? undefined,
    name: row.name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    onboardingComplete: Boolean(row.onboarding_complete),
    status: "active",
    createdAt: t(row.created_at),
    updatedAt: t(row.created_at),
  };
}

function mapProject(row: any) {
  return {
    legacySupabaseId: row.id,
    legacyOwnerId: row.user_id,
    name: row.name,
    slug: row.slug,
    brief: row.brief ?? undefined,
    color: row.color ?? "#4B57DB",
    visibility: "private",
    status: "active",
    createdAt: t(row.created_at),
    updatedAt: t(row.updated_at),
  };
}

function mapBoard(row: any) {
  return {
    legacySupabaseId: row.id,
    legacyOwnerId: row.user_id,
    legacyProjectId: row.project_id ?? undefined,
    name: row.name,
    type: row.type,
    createdAt: t(row.created_at),
    updatedAt: t(row.created_at),
  };
}

function mapReference(row: any) {
  return {
    legacySupabaseId: row.id,
    legacyOwnerId: row.user_id,
    legacyProjectId: row.project_id ?? undefined,
    boardId: row.board_id ?? undefined,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    title: row.title ?? undefined,
    source: row.source,
    tags: row.tags ?? [],
    colors: row.colors ?? [],
    mood: row.mood ?? undefined,
    style: row.style ?? undefined,
    contentType: row.content_type ?? undefined,
    curationStatus: row.curation_status ?? undefined,
    embedding: row.embedding ?? undefined,
    createdAt: t(row.created_at),
    updatedAt: t(row.updated_at),
  };
}

function mapInspirationImage(row: any) {
  return {
    legacySupabaseId: row.id,
    source: row.source,
    sourceId: row.source_id,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    title: row.title ?? undefined,
    scoreComposition: row.score_composition,
    scoreColor: row.score_color,
    scoreMood: row.score_mood,
    scoreUniqueness: row.score_uniqueness,
    scoreOverall: row.score_overall,
    gptAnalysis: row.gpt_analysis ?? undefined,
    tags: row.tags ?? [],
    colors: row.colors ?? [],
    mood: row.mood ?? undefined,
    style: row.style ?? undefined,
    curationStatus: row.curation_status ?? "pending",
    displayCount: row.display_count ?? 0,
    lastDisplayedAt: row.last_displayed_at ? t(row.last_displayed_at) : undefined,
    createdAt: t(row.created_at),
    updatedAt: t(row.updated_at),
  };
}

function mapInspirationLike(row: any) {
  return {
    legacySupabaseId: row.id,
    legacyUserId: row.user_id,
    legacyImageId: row.image_id,
    feedbackTags: row.feedback_tags ?? [],
    likedAt: t(row.liked_at),
  };
}

function mapInspirationDaily(row: any) {
  return {
    legacySupabaseId: row.id,
    legacyUserId: row.user_id,
    dateKey: String(row.date),
    legacyImageIds: row.image_ids ?? [],
    collection: row.collection ?? undefined,
    createdAt: t(row.created_at),
    updatedAt: t(row.created_at),
  };
}

function mapPublishedExport(row: any) {
  return {
    publicId: row.id,
    legacyOwnerId: row.user_id,
    html: row.html,
    isActive: row.is_active !== false,
    createdAt: t(row.created_at),
    updatedAt: t(row.created_at),
  };
}

function mapShareLink(row: any) {
  return {
    legacySupabaseId: row.id,
    shareId: row.share_id,
    legacyOwnerId: row.user_id,
    legacyProjectId: row.project_id ?? undefined,
    projectName: row.project_name ?? "Studio Moodboard",
    snapshot: row.snapshot ?? [],
    isActive: row.is_active !== false,
    expiresAt: row.expires_at ? t(row.expires_at) : undefined,
    createdAt: t(row.created_at),
    updatedAt: t(row.created_at),
  };
}

function redactIntegration(row: any) {
  return {
    legacySupabaseId: row.id,
    legacyUserId: row.user_id,
    provider: row.platform,
    scopes: row.scope ? String(row.scope).split(/[,\s]+/).filter(Boolean) : [],
    expiresAt: row.expires_at ? t(row.expires_at) : undefined,
    action: "reauthorize_or_encrypt_before_import",
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
