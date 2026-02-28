export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import type { FontCategory } from "@/lib/fonts/types";

interface GoogleFontMetadata {
  family: string;
  category: string;
  fonts: Record<string, unknown>;
  popularity?: number;
}

interface GoogleFontsResponse {
  familyMetadataList: GoogleFontMetadata[];
}

const categoryMap: Record<string, FontCategory> = {
  "Sans Serif": "sans-serif",
  Serif: "serif",
  Display: "display",
  Handwriting: "handwriting",
  "Sans": "sans-serif",
  Monospace: "monospace",
};

let cachedCatalog: { family: string; category: FontCategory; variants: string[]; popularity: number }[] | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") ?? "popularity";
  const category = searchParams.get("category");

  try {
    if (!cachedCatalog) {
      const res = await fetch("https://fonts.google.com/metadata/fonts", {
        headers: { "User-Agent": "Studio-OS/1.0" },
      });
      if (!res.ok) throw new Error("Failed to fetch Google Fonts");
      const data: GoogleFontsResponse = await res.json();
      cachedCatalog = (data.familyMetadataList ?? []).map((f) => {
        const variants = Object.keys(f.fonts ?? {}).filter((k) => !k.includes("i"));
        return {
          family: f.family,
          category: (categoryMap[f.category] ?? "sans-serif") as FontCategory,
          variants: variants.length ? variants : ["400"],
          popularity: f.popularity ?? 9999,
        };
      });
      cachedCatalog.sort((a, b) => a.popularity - b.popularity);
    }

    let list = [...cachedCatalog].map((f) => ({
      family: f.family,
      category: f.category,
      source: "google" as const,
      variants: f.variants,
      popularity: f.popularity,
    }));

    if (category && category !== "all") {
      const cat = category.toLowerCase().replace(/\s+/g, "-");
      list = list.filter((f) => f.category === cat);
    }

    if (sort === "name-asc") {
      list.sort((a, b) => a.family.localeCompare(b.family));
    } else if (sort === "name-desc") {
      list.sort((a, b) => b.family.localeCompare(a.family));
    } else if (sort === "popularity") {
      list.sort((a, b) => (a.popularity ?? 9999) - (b.popularity ?? 9999));
    }

    return NextResponse.json(list);
  } catch (err) {
    console.error("[fonts/google]", err);
    return NextResponse.json({ error: "Failed to fetch fonts" }, { status: 500 });
  }
}
