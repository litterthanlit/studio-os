"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fetchArenaReferences } from "@/lib/arena-api";

type ImportMode = "upload" | "arena" | "pinterest" | "url";

export interface Reference {
  id: string;
  imageUrl: string;
  source: "upload" | "arena" | "pinterest" | "url";
  sourceUrl?: string;
  title?: string;
  addedAt: string;
  projectId: string;
}

type ImportPayload = {
  references: Reference[];
  notice?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onImport: (payload: ImportPayload) => void;
  initialMode?: ImportMode;
  initialUrl?: string;
};

type UploadItem = { name: string; progress: number };

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getNameFromUrl(raw: string) {
  try {
    const url = new URL(raw);
    const file = url.pathname.split("/").pop() ?? "";
    return decodeURIComponent(file) || "Imported image";
  } catch {
    return "Imported image";
  }
}

function isLikelyImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(url.pathname + url.search);
  } catch {
    return false;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read image"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

async function fetchUrlAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await fileToDataUrl(new File([blob], "imported-image"));
  } catch {
    return null;
  }
}

function normalizeBoardSlugFromPinterestUrl(boardInput: string): string {
  try {
    const url = new URL(boardInput.trim());
    if (!url.hostname.includes("pinterest.")) return "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return parts[1] ?? "";
    }
    return "";
  } catch {
    return "";
  }
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function ImportReferenceModal({
  open,
  onOpenChange,
  projectId,
  onImport,
  initialMode = "upload",
  initialUrl = "",
}: Props) {
  const [mode, setMode] = React.useState<ImportMode>(initialMode);
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [uploadItems, setUploadItems] = React.useState<UploadItem[]>([]);
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);

  const [arenaInput, setArenaInput] = React.useState("");
  const [pinterestInput, setPinterestInput] = React.useState("");
  const [urlInput, setUrlInput] = React.useState(initialUrl);
  const [urlPreview, setUrlPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setUrlInput(initialUrl);
    setUrlPreview(isLikelyImageUrl(initialUrl) ? initialUrl : null);
    setError(null);
    setIsBusy(false);
    setUploadItems([]);
  }, [open, initialMode, initialUrl]);

  async function importUploadedFiles(files: File[]) {
    const validFiles = files.filter((file) => ACCEPTED_FILE_TYPES.includes(file.type));
    if (validFiles.length === 0) {
      setError("Upload jpg, png, gif, or webp files.");
      return;
    }

    setIsBusy(true);
    setError(null);
    setUploadItems(validFiles.map((file) => ({ name: file.name, progress: 0 })));
    const now = new Date().toISOString();
    const imported: Reference[] = [];

    for (let i = 0; i < validFiles.length; i += 1) {
      const file = validFiles[i];
      const dataUrl = await fileToDataUrl(file);
      imported.push({
        id: makeId("upload"),
        imageUrl: dataUrl,
        source: "upload",
        title: file.name,
        addedAt: now,
        projectId,
      });
      setUploadItems((prev) =>
        prev.map((item, index) => (index === i ? { ...item, progress: 100 } : item))
      );
    }

    onImport({
      references: imported,
      notice: `Added ${imported.length} upload${imported.length === 1 ? "" : "s"}.`,
    });
    setIsBusy(false);
    onOpenChange(false);
  }

  async function handleArenaImport() {
    setIsBusy(true);
    setError(null);
    try {
      const result = await fetchArenaReferences(arenaInput);
      const now = new Date().toISOString();
      const references: Reference[] = result.references.map((item) => ({
        id: makeId(item.id),
        imageUrl: item.imageUrl,
        source: "arena",
        sourceUrl: item.sourceUrl ?? `https://www.are.na/${result.channelSlug}`,
        title: item.title || result.channelName,
        addedAt: now,
        projectId,
      }));
      onImport({
        references,
        notice: `Imported from Are.na ${result.channelName}`,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import Are.na channel.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePinterestImport() {
    setIsBusy(true);
    setError(null);
    try {
      const boardSlug = normalizeBoardSlugFromPinterestUrl(pinterestInput);
      if (!boardSlug) {
        throw new Error("Enter a valid Pinterest board URL.");
      }

      const boardsRes = await fetch("/api/pinterest/boards");
      const boardsData = await boardsRes.json().catch(() => ({}));
      if (!boardsRes.ok) {
        throw new Error(boardsData.error ?? "Pinterest is not connected.");
      }

      const boards = (boardsData.boards ?? []) as Array<{
        id: string;
        name: string;
        pin_count: number;
      }>;

      const slugNeedle = normalizeForMatch(boardSlug.replace(/-/g, " "));
      const matchedBoard = boards.find((board) => {
        const boardName = normalizeForMatch(board.name);
        return boardName.includes(slugNeedle) || slugNeedle.includes(boardName);
      });

      if (!matchedBoard) {
        throw new Error(
          "Could not resolve that board URL to your connected Pinterest boards."
        );
      }

      const pinsRes = await fetch(`/api/pinterest/boards/${matchedBoard.id}/pins`);
      const pinsData = await pinsRes.json().catch(() => ({}));
      if (!pinsRes.ok) {
        throw new Error(pinsData.error ?? "Failed to import Pinterest pins.");
      }

      const now = new Date().toISOString();
      const pins = (pinsData.pins ?? []) as Array<{
        id: string;
        imageUrl: string | null;
        title: string | null;
        link: string | null;
      }>;

      const references: Reference[] = pins
        .filter((pin) => Boolean(pin.imageUrl))
        .map((pin) => ({
          id: makeId(`pinterest-${pin.id}`),
          imageUrl: pin.imageUrl as string,
          source: "pinterest",
          sourceUrl: pin.link ?? pinterestInput.trim(),
          title: pin.title ?? matchedBoard.name,
          addedAt: now,
          projectId,
        }));

      if (references.length === 0) {
        throw new Error("No importable images found on this board.");
      }

      onImport({
        references,
        notice: `Imported ${references.length} pin${references.length === 1 ? "" : "s"} from Pinterest.`,
      });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Pinterest import is unavailable right now."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUrlImport() {
    const candidate = urlInput.trim();
    if (!isLikelyImageUrl(candidate)) {
      setError("Enter a direct image URL ending in jpg, png, gif, or webp.");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const dataUrl = await fetchUrlAsDataUrl(candidate);
      onImport({
        references: [
          {
            id: makeId("url"),
            imageUrl: dataUrl ?? candidate,
            source: "url",
            sourceUrl: candidate,
            title: getNameFromUrl(candidate),
            addedAt: new Date().toISOString(),
            projectId,
          },
        ],
        notice: "Added image from URL.",
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import image URL.");
    } finally {
      setIsBusy(false);
    }
  }

  function onUrlPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!pasted) return;
    if (isLikelyImageUrl(pasted)) {
      setUrlInput(pasted);
      setUrlPreview(pasted);
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <div className="space-y-4">
          <DialogTitle className="text-base font-medium text-white">
            Import References
          </DialogTitle>

          <div className="flex flex-wrap gap-2 border-b border-border-subtle pb-3">
            {([
              ["upload", "Upload files"],
              ["arena", "From Are.na"],
              ["pinterest", "From Pinterest"],
              ["url", "Paste image URL"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={cn(
                  "border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors",
                  mode === value
                    ? "border-white/30 bg-white/[0.08] text-white"
                    : "border-border-primary bg-bg-secondary text-text-tertiary hover:text-white"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "upload" && (
            <div className="space-y-3">
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 0) void importUploadedFiles(files);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isBusy}
                className="w-full border border-dashed border-border-primary bg-bg-secondary px-4 py-10 text-sm text-text-secondary transition-colors hover:border-white/30 disabled:opacity-50"
              >
                Click to choose files (jpg, png, gif, webp)
              </button>
              {uploadItems.length > 0 && (
                <div className="space-y-2">
                  {uploadItems.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-text-secondary">
                        <span className="truncate">{item.name}</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="h-1 bg-sidebar-active">
                        <div
                          className="h-full bg-accent transition-all duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === "arena" && (
            <div className="space-y-3">
              <Input
                value={arenaInput}
                onChange={(event) => setArenaInput(event.target.value)}
                placeholder="https://www.are.na/channel-name or channel-name"
                disabled={isBusy}
              />
              <button
                type="button"
                onClick={() => void handleArenaImport()}
                disabled={isBusy || !arenaInput.trim()}
                className="border border-border-primary bg-bg-secondary px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:border-white/30 disabled:opacity-50"
              >
                {isBusy ? "Importing..." : "Import channel"}
              </button>
            </div>
          )}

          {mode === "pinterest" && (
            <div className="space-y-3">
              <Input
                value={pinterestInput}
                onChange={(event) => setPinterestInput(event.target.value)}
                placeholder="https://www.pinterest.com/{user}/{board}/"
                disabled={isBusy}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handlePinterestImport()}
                  disabled={isBusy || !pinterestInput.trim()}
                  className="border border-border-primary bg-bg-secondary px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:border-white/30 disabled:opacity-50"
                >
                  {isBusy ? "Importing..." : "Import board"}
                </button>
                <a
                  href="/api/auth/pinterest"
                  className="border border-[#E60023]/40 bg-[#E60023]/10 px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-[#E60023] transition-colors hover:bg-[#E60023]/20"
                >
                  Connect Pinterest
                </a>
              </div>
            </div>
          )}

          {mode === "url" && (
            <div className="space-y-3">
              <Input
                value={urlInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setUrlInput(value);
                  setUrlPreview(isLikelyImageUrl(value) ? value : null);
                }}
                onPaste={onUrlPaste}
                placeholder="https://example.com/image.jpg"
                disabled={isBusy}
              />
              {urlPreview && (
                <div className="border border-card-border bg-bg-secondary p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlPreview}
                    alt="URL preview"
                    className="max-h-56 w-full object-contain"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => void handleUrlImport()}
                disabled={isBusy || !urlInput.trim()}
                className="border border-border-primary bg-bg-secondary px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:border-white/30 disabled:opacity-50"
              >
                {isBusy ? "Saving..." : "Save image"}
              </button>
            </div>
          )}

          {error && (
            <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
