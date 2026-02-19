import type { SupabaseClient } from "@supabase/supabase-js";

export const PINTEREST_API = "https://api.pinterest.com/v5";
const TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";

// ─── Public types ─────────────────────────────────────────────────────────────

export type PinterestBoard = {
  id: string;
  name: string;
  description?: string;
  pin_count: number;
  image_thumbnail_url?: string;
  privacy?: "PUBLIC" | "PROTECTED" | "SECRET";
};

export type PinterestPin = {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  board_id: string;
  media?: {
    images?: {
      original?: { url: string; width: number; height: number };
      "1200x"?: { url: string; width: number; height: number };
      "600x"?: { url: string; width: number; height: number };
      "400x300"?: { url: string; width: number; height: number };
    };
    media_type?: string;
  };
};

type PinterestListResponse<T> = {
  items: T[];
  bookmark?: string;
};

// ─── Token management ─────────────────────────────────────────────────────────

function getCredentials(): string {
  const id = process.env.PINTEREST_CLIENT_ID ?? "";
  const secret = process.env.PINTEREST_CLIENT_SECRET ?? "";
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

async function refreshAccessToken(
  oldRefreshToken: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string } | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${getCredentials()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: oldRefreshToken,
      }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch the current Pinterest access token for the authenticated user.
 * Auto-refreshes if it expires within 5 minutes.
 * Returns null if Pinterest is not connected.
 */
export async function getPinterestToken(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row, error } = await supabase
    .from("integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .eq("platform", "pinterest")
    .single();

  if (error || !row) return null;

  // Proactively refresh if token expires within 5 minutes
  if (row.expires_at && row.refresh_token) {
    const expiresAt = new Date(row.expires_at as string);
    const needsRefresh = expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

    if (needsRefresh) {
      const refreshed = await refreshAccessToken(row.refresh_token as string);
      if (refreshed) {
        const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
        await supabase
          .from("integrations")
          .update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token ?? row.refresh_token,
            expires_at: newExpiry,
          })
          .eq("user_id", user.id)
          .eq("platform", "pinterest");
        return refreshed.access_token;
      }
    }
  }

  return row.access_token as string;
}

// ─── Authenticated API calls ──────────────────────────────────────────────────

async function pinterestFetch<T>(path: string, supabase: SupabaseClient): Promise<T> {
  const token = await getPinterestToken(supabase);
  if (!token) throw new Error("Pinterest not connected");

  const res = await fetch(`${PINTEREST_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pinterest API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Board helpers ────────────────────────────────────────────────────────────

/**
 * Fetch all boards for the authenticated Pinterest user (max 200).
 */
export async function fetchBoards(supabase: SupabaseClient): Promise<PinterestBoard[]> {
  const boards: PinterestBoard[] = [];
  let bookmark: string | undefined;

  do {
    const params = new URLSearchParams({ page_size: "50" });
    if (bookmark) params.set("bookmark", bookmark);

    const data = await pinterestFetch<PinterestListResponse<PinterestBoard>>(
      `/boards?${params}`,
      supabase
    );
    boards.push(...data.items);
    bookmark = data.bookmark;
  } while (bookmark && boards.length < 200);

  return boards;
}

// ─── Pin helpers ──────────────────────────────────────────────────────────────

/**
 * Extract the best available image URL from a pin.
 */
export function pinImageUrl(pin: PinterestPin): string | null {
  const imgs = pin.media?.images;
  if (!imgs) return null;
  return (
    imgs["1200x"]?.url ??
    imgs.original?.url ??
    imgs["600x"]?.url ??
    imgs["400x300"]?.url ??
    null
  );
}

/**
 * Fetch all image pins from a board (max 500, images only).
 */
export async function fetchPins(
  boardId: string,
  supabase: SupabaseClient
): Promise<PinterestPin[]> {
  const pins: PinterestPin[] = [];
  let bookmark: string | undefined;

  do {
    const params = new URLSearchParams({
      page_size: "100",
      // only fetch image media
    });
    if (bookmark) params.set("bookmark", bookmark);

    const data = await pinterestFetch<PinterestListResponse<PinterestPin>>(
      `/boards/${boardId}/pins?${params}`,
      supabase
    );

    // Keep only pins with at least one image URL
    const imagePins = data.items.filter((p) => pinImageUrl(p) !== null);
    pins.push(...imagePins);
    bookmark = data.bookmark;
  } while (bookmark && pins.length < 500);

  return pins;
}
