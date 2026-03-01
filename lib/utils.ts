import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates redirect path to prevent open redirects.
 * Only allows relative paths starting with /. Rejects //, absolute URLs, etc.
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/home"
): string {
  if (!next || typeof next !== "string") return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  return trimmed;
}

