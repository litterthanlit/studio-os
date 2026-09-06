/**
 * Client and server helper for “is this deployment actually talking to Convex?”
 * A missing URL or the handwritten placeholder must never issue live queries.
 */
export function getPublicConvexUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) return null;
  if (url.includes("placeholder.convex.cloud")) return null;
  return url;
}

export function isConvexConfigured(): boolean {
  return getPublicConvexUrl() !== null;
}
