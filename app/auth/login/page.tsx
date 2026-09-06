"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { isConvexConfigured } from "@/lib/convex/is-configured";
import { cn, safeRedirectPath } from "@/lib/utils";

type State = "idle" | "loading" | "sent" | "error";
type GoogleState = "idle" | "loading" | "error";
type PasswordFlow = "signIn" | "signUp";

export default function LoginPage() {
  return (
    <React.Suspense>
      {isConvexConfigured() ? <LoginContent /> : <LoginUnconfigured />}
    </React.Suspense>
  );
}

function LoginUnconfigured() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6">
      <div className="relative w-full max-w-[360px] space-y-4 text-center">
        <h1 className="text-[22px] font-medium tracking-[-0.02em] text-text-primary">
          Cloud auth isn’t configured
        </h1>
        <p className="text-[13px] text-text-tertiary">
          Set <code className="font-mono text-[12px]">NEXT_PUBLIC_CONVEX_URL</code> and Convex Auth
          env vars, then reload. See <code className="font-mono text-[12px]">.env.example</code>.
        </p>
      </div>
    </div>
  );
}

function GoogleButton({
  next,
  onError,
}: {
  next: string;
  onError: (message: string) => void;
}) {
  const { signIn } = useAuthActions();
  const [state, setState] = React.useState<GoogleState>("idle");

  async function handleGoogle() {
    if (state === "loading") return;
    setState("loading");
    try {
      await signIn("google", { redirectTo: next });
    } catch (error) {
      setState("error");
      onError(
        error instanceof Error
          ? error.message
          : "Google sign-in isn’t configured for this deployment yet.",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleGoogle()}
      disabled={state === "loading"}
      className={cn(
        "flex w-full items-center justify-center gap-3 rounded-[4px] border py-2.5 text-sm font-medium transition-[opacity,background-color] duration-200 ease-out",
        "border-border-subtle bg-transparent text-text-secondary hover:bg-card-bg hover:text-text-primary disabled:opacity-50"
      )}
    >
      {state === "loading" ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      {state === "loading" ? "Redirecting to Google…" : "Continue with Google"}
    </button>
  );
}

function describeAuthError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  if (lower.includes("invalidsecret") || lower.includes("invalidaccountid") || lower.includes("invalid password")) {
    return "Incorrect email or password.";
  }
  if (lower.includes("already exists") || lower.includes("already used")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (lower.includes("resend") || lower.includes("auth_resend") || lower.includes("email provider")) {
    return "Magic link email isn’t configured. Use a password, Google, or set AUTH_RESEND_KEY.";
  }
  if (lower.includes("google") || lower.includes("oauth")) {
    return "Google sign-in isn’t configured. Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in Convex.";
  }
  return message || fallback;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeRedirectPath(searchParams.get("next"));
  const { signIn } = useAuthActions();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [state, setState] = React.useState<State>("idle");
  const [errorMsg, setErrorMsg] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isDev = process.env.NODE_ENV !== "production";

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "loading") return;
    setState("loading");
    setErrorMsg("");
    try {
      await signIn("resend", { email: email.trim(), redirectTo: next });
      setState("sent");
    } catch (error) {
      setState("error");
      setErrorMsg(describeAuthError(error, "Couldn’t send a magic link."));
    }
  }

  async function handlePassword(flow: PasswordFlow) {
    if (!email.trim() || !password || state === "loading") return;
    setState("loading");
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.set("email", email.trim());
      formData.set("password", password);
      formData.set("flow", flow);
      const result = await signIn("password", formData);
      if (result.signingIn) {
        router.replace(next);
        return;
      }
      setState("idle");
    } catch (error) {
      setState("error");
      setErrorMsg(describeAuthError(error, flow === "signUp" ? "Couldn’t create an account." : "Couldn’t sign in."));
    }
  }

  async function handleAnonymous() {
    if (state === "loading") return;
    setState("loading");
    setErrorMsg("");
    try {
      const result = await signIn("anonymous");
      if (result.signingIn) {
        router.replace(next);
        return;
      }
      setState("idle");
    } catch (error) {
      setState("error");
      setErrorMsg(describeAuthError(error, "Couldn’t start a local session."));
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 640px 420px at 50% 46%, rgba(75,87,219,0.055) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[360px]">
        <div className="mb-10 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-[4px] border border-border-subtle bg-card-bg">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-accent"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
              <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
              <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
              <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
            </svg>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {state === "sent" ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 text-center"
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[4px] border border-accent/25 bg-accent/10">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-accent"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              </div>

              <div className="space-y-1.5">
                <h1 className="text-[22px] font-medium tracking-[-0.02em] text-text-primary">
                  Check your inbox
                </h1>
                <p className="text-[13px] text-text-tertiary">
                  Magic link sent to{" "}
                  <span className="text-text-secondary">{email}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setState("idle"); setErrorMsg(""); }}
                className="text-[12px] text-text-muted transition-colors duration-200 hover:text-text-secondary"
              >
                Use a different email
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-[26px] font-medium leading-tight tracking-[-0.02em] text-text-primary">
                  Sign in to<br />Studio OS
                </h1>
                <p className="text-[13px] text-text-tertiary">
                  Magic link, Google, or a password. Local password works without email.
                </p>
              </div>

              <GoogleButton next={next} onError={(message) => { setState("error"); setErrorMsg(message); }} />

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-border-subtle" />
                <span className="text-[11px] text-text-muted">or continue with email</span>
                <div className="h-px flex-1 bg-border-subtle" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-4">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={cn(
                    "w-full border-b bg-transparent py-3 text-[17px] text-text-primary outline-none placeholder:text-text-muted",
                    "transition-[border-color] duration-200 ease-out",
                    email.trim()
                      ? "border-border-hover"
                      : "border-border-subtle focus:border-border-secondary"
                  )}
                />

                {showPassword ? (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (8+ characters)"
                    autoComplete="current-password"
                    className="w-full border-b border-border-subtle bg-transparent py-3 text-[17px] text-text-primary outline-none placeholder:text-text-muted focus:border-border-secondary"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPassword(true)}
                    className="text-[12px] text-text-muted transition-colors hover:text-text-secondary"
                  >
                    Use a password instead
                  </button>
                )}

                <AnimatePresence>
                  {state === "error" && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[12px] text-red-400"
                    >
                      {errorMsg}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={!email.trim() || state === "loading"}
                  className={cn(
                    "w-full rounded-[4px] py-2.5 text-sm font-medium transition-[opacity,background-color] duration-200 ease-out",
                    email.trim() && state !== "loading"
                      ? "bg-accent text-white hover:opacity-90"
                      : "cursor-not-allowed bg-accent/15 text-white/25"
                  )}
                >
                  {state === "loading" ? "Sending…" : "Send magic link"}
                </button>

                {showPassword ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handlePassword("signIn")}
                      disabled={!email.trim() || password.length < 8 || state === "loading"}
                      className="flex-1 rounded-[4px] border border-border-subtle py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary disabled:opacity-50"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => void handlePassword("signUp")}
                      disabled={!email.trim() || password.length < 8 || state === "loading"}
                      className="flex-1 rounded-[4px] border border-border-subtle py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary disabled:opacity-50"
                    >
                      Create account
                    </button>
                  </div>
                ) : null}
              </form>

              {isDev ? (
                <button
                  type="button"
                  onClick={() => void handleAnonymous()}
                  disabled={state === "loading"}
                  className="w-full text-[12px] text-text-muted transition-colors hover:text-text-secondary"
                >
                  Continue as a local user
                </button>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-5 left-0 right-0 text-center">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-muted">
          Studio OS
        </span>
      </div>
    </div>
  );
}
