import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

type ShareSnapshot = {
  id: string;
  imageUrl: string;
  board: string;
  notes?: string;
  tags: {
    style: string[];
    colors: string[];
    contentType: string[];
    mood: string[];
    ai: string[];
  };
  curationStatus?: string | null;
};

type ShareData = {
  share_id: string;
  project_name: string;
  snapshot: ShareSnapshot[];
  created_at: string;
};

async function getShare(id: string): Promise<ShareData | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shares")
      .select("share_id, project_name, snapshot, created_at")
      .eq("share_id", id)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;
    return data as ShareData;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const share = await getShare(id);
  if (!share) {
    return { title: "Moodboard — Studio OS" };
  }

  const firstImage = share.snapshot[0]?.imageUrl;
  return {
    title: `${share.project_name} — Studio OS`,
    description: `${share.snapshot.length} references · Moodboard shared from Studio OS`,
    openGraph: {
      title: `${share.project_name} — Moodboard`,
      description: `${share.snapshot.length} curated references`,
      images: firstImage ? [{ url: firstImage, width: 1200, height: 630 }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${share.project_name} — Moodboard`,
      description: `${share.snapshot.length} curated references · Made with Studio OS`,
      images: firstImage ? [firstImage] : [],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const share = await getShare(id);

  if (!share) notFound();

  const references = (share.snapshot ?? []).filter(
    (r) => r.curationStatus !== "reject"
  );

  const allColors = Array.from(
    new Set(references.flatMap((r) => r.tags?.colors ?? []))
  ).slice(0, 12);

  const date = new Date(share.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Split references into masonry columns
  const COL_COUNT = 4;
  const columns: ShareSnapshot[][] = Array.from({ length: COL_COUNT }, () => []);
  references.forEach((ref, i) => {
    columns[i % COL_COUNT].push(ref);
  });

  return (
    <div className="min-h-screen bg-white text-[#111111]">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="mx-auto max-w-[1200px] px-8 py-16">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">
          Moodboard
        </p>
        <h1 className="mb-3 text-4xl font-semibold tracking-tight text-[#111111] md:text-5xl">
          {share.project_name}
        </h1>
        <p className="text-sm text-text-secondary">
          {references.length} reference{references.length !== 1 ? "s" : ""} ·{" "}
          {date}
        </p>
      </header>

      {/* ── Masonry grid ────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1200px] px-8 pb-24">
        <div className="columns-2 gap-3 md:columns-4">
          {references.map((ref) => (
            <div
              key={ref.id}
              className="mb-3 break-inside-avoid overflow-hidden rounded-lg"
            >
              <div className="relative w-full overflow-hidden rounded-lg bg-[#f4f4f4]">
                <Image
                  src={ref.imageUrl}
                  alt={ref.notes ?? ref.board}
                  width={600}
                  height={800}
                  className="h-auto w-full object-cover"
                  unoptimized
                />
              </div>
              {ref.notes && (
                <p className="mt-2 text-xs text-text-secondary">{ref.notes}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Color palette ─────────────────────────────────────── */}
        {allColors.length > 0 && (
          <section className="mt-20 border-t border-[#eeeeee] pt-16">
            <h2 className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">
              Palette
            </h2>
            <div className="flex flex-wrap gap-3">
              {allColors.map((color) => (
                <div key={color} className="flex flex-col items-center gap-2">
                  <div
                    className="h-10 w-10 rounded-full border border-[#eeeeee] shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                  <span className="text-[10px] font-mono text-[#aaaaaa]">
                    {color}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#eeeeee] py-10">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-8">
          <p className="text-xs text-text-primary">
            Made with{" "}
            <a
              href="https://studioos.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#aaaaaa] underline-offset-2 hover:underline"
            >
              Studio OS
            </a>
          </p>
          <p className="text-xs text-[#dddddd]">Read-only · No account required</p>
        </div>
      </footer>
    </div>
  );
}
