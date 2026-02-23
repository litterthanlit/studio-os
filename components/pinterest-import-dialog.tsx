"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type PinterestBoard = {
  id: string;
  name: string;
  description?: string;
  pin_count: number;
  image_thumbnail_url?: string;
};

type PinterestPin = {
  id: string;
  title: string | null;
  description: string | null;
  link: string | null;
  imageUrl: string | null;
  boardId: string;
};

export type ImportedPinterestRef = {
  id: string;
  imageUrl: string;
  board: string; // Vision board destination (Brand, Color, etc.)
  title: string;
  source: "pinterest";
};

const VISION_BOARDS = [
  "Brand",
  "Typography",
  "Color",
  "Layout",
  "Photography",
  "Motion",
] as const;
type VisionBoard = (typeof VISION_BOARDS)[number];

type Step = "boards" | "destination" | "importing" | "done";

// ─── Sub-components ───────────────────────────────────────────────────────────

function PinterestLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

// ─── Step 1: Board selection ──────────────────────────────────────────────────

function StepBoards({
  boards,
  loading,
  error,
  selected,
  onToggle,
  onContinue,
  onConnect,
}: {
  boards: PinterestBoard[];
  loading: boolean;
  error: string | null;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onContinue: () => void;
  onConnect: () => void;
}) {
  const isNotConnected = error?.includes("not connected") || error?.includes("403");

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse border border-border-subtle bg-bg-secondary"
              style={{ height: 112 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (isNotConnected) {
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E60023]/30 bg-[#E60023]/10">
          <PinterestLogo className="h-6 w-6 text-[#E60023]" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-white">Pinterest not connected</p>
          <p className="max-w-[280px] text-[12px] text-gray-500">
            Connect your Pinterest account to import boards and pins directly into Vision.
          </p>
        </div>
        <button
          type="button"
          onClick={onConnect}
          className="flex items-center gap-2 bg-[#E60023] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <PinterestLogo className="h-4 w-4" />
          Connect Pinterest
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <p className="border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
        {error}
      </p>
    );
  }

  if (boards.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No boards found on your Pinterest account.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
        {boards.map((board) => {
          const isSelected = selected.has(board.id);
          return (
            <button
              key={board.id}
              type="button"
              onClick={() => onToggle(board.id)}
              className={cn(
                "group relative flex flex-col overflow-hidden border text-left transition-[border-color,background-color] duration-200",
                isSelected
                  ? "border-[#E60023]/50 bg-[#E60023]/[0.06]"
                  : "border-card-border bg-bg-secondary hover:border-border-hover"
              )}
            >
              {/* Thumbnail */}
              <div className="relative h-24 w-full overflow-hidden bg-card-bg">
                {board.image_thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={board.image_thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <PinterestLogo className="h-6 w-6 text-text-muted" />
                  </div>
                )}
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E60023]">
                    <svg viewBox="0 0 10 10" className="h-3 w-3" fill="none">
                      <path
                        d="M2 5.5l2 2 4-4"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="px-2.5 py-2">
                <div className="truncate text-[12px] font-medium text-white">
                  {board.name}
                </div>
                <div className="text-[10px] text-gray-600">
                  {board.pin_count} pin{board.pin_count !== 1 ? "s" : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="text-[11px] text-gray-600">
          {selected.size === 0
            ? "Select boards to import"
            : `${selected.size} board${selected.size !== 1 ? "s" : ""} selected`}
        </span>
        <button
          type="button"
          onClick={onContinue}
          disabled={selected.size === 0}
          className="bg-white px-4 py-2 text-[12px] font-medium text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-30 hover:opacity-80"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Destination ──────────────────────────────────────────────────────

function StepDestination({
  destination,
  onSelect,
  onBack,
  onImport,
  selectedBoardCount,
  totalPins,
}: {
  destination: VisionBoard | null;
  onSelect: (b: VisionBoard) => void;
  onBack: () => void;
  onImport: () => void;
  selectedBoardCount: number;
  totalPins: number;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-[12px] text-gray-500">
          Which Vision board should these pins go into?
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {VISION_BOARDS.map((board) => {
          const isActive = destination === board;
          return (
            <button
              key={board}
              type="button"
              onClick={() => onSelect(board)}
              className={cn(
                "border px-3 py-3 text-left transition-[border-color,background-color,color] duration-200",
                isActive
                  ? "border-white/30 bg-white/[0.08] text-white"
                  : "border-card-border bg-bg-secondary text-gray-400 hover:border-border-hover hover:text-white"
              )}
            >
              <div className="text-[12px] font-medium">{board}</div>
            </button>
          );
        })}
      </div>

      <div className="border border-border-subtle bg-card-bg px-3.5 py-3">
        <div className="text-[11px] text-gray-600">Import summary</div>
        <div className="mt-1 text-[12px] text-white">
          {selectedBoardCount} board{selectedBoardCount !== 1 ? "s" : ""} →{" "}
          <span className="text-gray-400">
            {totalPins > 0 ? `~${totalPins} pins` : "counting pins…"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle pt-3">
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] text-gray-500 transition-colors hover:text-white"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={!destination}
          className="bg-[#E60023] px-4 py-2 text-[12px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30 hover:opacity-90"
        >
          Import to Vision
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Progress ─────────────────────────────────────────────────────────

function StepImporting({
  done,
  total,
  currentBoard,
}: {
  done: number;
  total: number;
  currentBoard: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E60023]/30 bg-[#E60023]/10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
        >
          <PinterestLogo className="h-6 w-6 text-[#E60023]" />
        </motion.div>
      </div>

      <div className="w-full space-y-2 text-center">
        <p className="text-sm font-medium text-white">Importing from Pinterest…</p>
        <p className="truncate text-[11px] text-gray-500">{currentBoard}</p>
      </div>

      <div className="w-full space-y-2">
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-sidebar-active">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-[#E60023]"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-600">
          <span>{done} imported</span>
          <span>{total} total</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function StepDone({
  count,
  destination,
  onClose,
}: {
  count: number;
  destination: VisionBoard | null;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
        <svg viewBox="0 0 20 20" className="h-6 w-6 text-emerald-400" fill="none">
          <path
            d="M4 10l4.5 4.5L16 6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-white">
          {count} reference{count !== 1 ? "s" : ""} imported
        </p>
        <p className="text-[12px] text-gray-500">
          Added to Vision → {destination ?? "All"}
          <br />
          AI tagging is running in the background.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="border border-border-primary bg-bg-secondary px-5 py-2 text-[12px] font-medium text-white transition-colors hover:border-white/20"
      >
        Close
      </button>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeBoard: string;
  onImport: (refs: ImportedPinterestRef[]) => void;
};

export function PinterestImportDialog({ open, onOpenChange, activeBoard, onImport }: Props) {
  const [step, setStep] = React.useState<Step>("boards");
  const [boards, setBoards] = React.useState<PinterestBoard[]>([]);
  const [boardsLoading, setBoardsLoading] = React.useState(false);
  const [boardsError, setBoardsError] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [destination, setDestination] = React.useState<VisionBoard | null>(
    () =>
      VISION_BOARDS.includes(activeBoard as VisionBoard)
        ? (activeBoard as VisionBoard)
        : "Brand"
  );
  const [totalPins, setTotalPins] = React.useState(0);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [currentBoard, setCurrentBoard] = React.useState("");
  const [importedCount, setImportedCount] = React.useState(0);

  // Load boards when dialog opens
  React.useEffect(() => {
    if (!open) return;
    setStep("boards");
    setSelectedIds(new Set());
    setBoardsError(null);

    setBoardsLoading(true);
    fetch("/api/pinterest/boards")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        setBoards(data.boards ?? []);
      })
      .catch((err) => {
        setBoardsError(err instanceof Error ? err.message : "Failed to load boards");
      })
      .finally(() => setBoardsLoading(false));
  }, [open]);

  // Estimate total pins when boards are selected
  React.useEffect(() => {
    if (selectedIds.size === 0) {
      setTotalPins(0);
      return;
    }
    const selected = boards.filter((b) => selectedIds.has(b.id));
    setTotalPins(selected.reduce((sum, b) => sum + b.pin_count, 0));
  }, [selectedIds, boards]);

  function toggleBoard(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImport() {
    if (!destination || selectedIds.size === 0) return;
    setStep("importing");

    const selectedBoards = boards.filter((b) => selectedIds.has(b.id));
    const allRefs: ImportedPinterestRef[] = [];
    let done = 0;

    for (const board of selectedBoards) {
      setCurrentBoard(board.name);

      try {
        const res = await fetch(`/api/pinterest/boards/${board.id}/pins`);
        if (!res.ok) continue;
        const data: { pins: PinterestPin[] } = await res.json();

        for (const pin of data.pins) {
          if (!pin.imageUrl) continue;
          allRefs.push({
            id: `pinterest-${pin.id}`,
            imageUrl: pin.imageUrl,
            board: destination,
            title: pin.title ?? pin.description ?? board.name,
            source: "pinterest",
          });
          done++;
          setProgress({ done, total: Math.max(done, totalPins) });
        }
      } catch {
        // Skip failed boards; import the ones that work
      }
    }

    setImportedCount(allRefs.length);
    onImport(allRefs);
    setStep("done");
  }

  function handleClose() {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setStep("boards");
      setBoards([]);
      setSelectedIds(new Set());
      setProgress({ done: 0, total: 0 });
    }, 300);
  }

  const stepTitles: Record<Step, string> = {
    boards: "Import from Pinterest",
    destination: "Choose destination",
    importing: "Importing…",
    done: "Import complete",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-[480px] overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-border-subtle pb-4">
          <PinterestLogo className="h-4 w-4 text-[#E60023]" />
          <DialogTitle className="text-[14px] font-medium text-white">
            {stepTitles[step]}
          </DialogTitle>
          {/* Step indicator */}
          {(step === "boards" || step === "destination") && (
            <div className="ml-auto flex items-center gap-1">
              {(["boards", "destination"] as Step[]).map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1 rounded-full transition-[width,background-color] duration-300",
                    s === step ? "w-4 bg-[#E60023]" : "w-1.5 bg-[#2a2a2a]"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {step === "boards" && (
              <StepBoards
                boards={boards}
                loading={boardsLoading}
                error={boardsError}
                selected={selectedIds}
                onToggle={toggleBoard}
                onContinue={() => setStep("destination")}
                onConnect={() => {
                  window.location.href = "/api/auth/pinterest";
                }}
              />
            )}
            {step === "destination" && (
              <StepDestination
                destination={destination}
                onSelect={setDestination}
                onBack={() => setStep("boards")}
                onImport={handleImport}
                selectedBoardCount={selectedIds.size}
                totalPins={totalPins}
              />
            )}
            {step === "importing" && (
              <StepImporting
                done={progress.done}
                total={Math.max(progress.total, 1)}
                currentBoard={currentBoard}
              />
            )}
            {step === "done" && (
              <StepDone
                count={importedCount}
                destination={destination}
                onClose={handleClose}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
