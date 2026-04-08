"use client";

export const PROFILE_STORAGE_KEY = "studio-os:profile";
export const PROFILE_UPDATED_EVENT = "studio-os:profile-updated";

export type UserProfile = {
  name: string;
};

export function readStoredProfile(): UserProfile {
  if (typeof window === "undefined") return { name: "Nick" };
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { name: "Nick" };
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return { name: (parsed.name ?? "Nick").trim() || "Nick" };
  } catch {
    return { name: "Nick" };
  }
}

export function writeStoredProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: profile }));
}
