import Google from "@auth/core/providers/google";
import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import {
  adminEmails,
  canReadProject,
  canWriteProject,
  ensureAllowlistedAdminRole,
  getCurrentUser,
  getUserByToken,
  now,
  requireAdmin,
  requireIdentity,
  requireProjectOwner,
  requireUser,
  syncStudioUserRecord,
  writeAuditLog,
} from "./authHelpers";

export {
  adminEmails,
  canReadProject,
  canWriteProject,
  ensureAllowlistedAdminRole,
  getCurrentUser,
  getUserByToken,
  now,
  requireAdmin,
  requireIdentity,
  requireProjectOwner,
  requireUser,
  syncStudioUserRecord,
  writeAuditLog,
};

function authFromAddress() {
  return (
    process.env.AUTH_EMAIL_FROM ??
    process.env.RESEND_FROM_EMAIL ??
    "Studio OS <noreply@studio-os.io>"
  );
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Resend({
      from: authFromAddress(),
      ...(process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY
        ? { apiKey: process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY }
        : {}),
    }),
    Google,
    Anonymous,
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      const site = (process.env.SITE_URL ?? "").replace(/\/$/, "");
      if (!redirectTo) return site || "/home";
      if (redirectTo.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.includes("://")) {
        return site ? `${site}${redirectTo}` : redirectTo;
      }
      if (site && redirectTo.startsWith(site)) return redirectTo;
      return site || "/home";
    },
    async afterUserCreatedOrUpdated(ctx, { userId, profile }) {
      await syncStudioUserRecord(ctx, userId, {
        email: profile.email ?? null,
        name: typeof profile.name === "string" ? profile.name : null,
        pictureUrl: typeof profile.image === "string" ? profile.image : null,
      });
    },
  },
});
