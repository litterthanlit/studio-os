"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { cn, safeRedirectPath } from "@/lib/utils";

type State = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<State>("idle");
  const [errorMsg, setErrorMsg] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "loading") return;
    setState("loading");
    setErrorMsg("");

    const next = safeRedirectPath(searchParams.get("next"));
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      setState("error");
      setErrorMsg(error.message);
      return;
    }
    setState("sent");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 640px 420px at 50% 46%, rgba(0,112,243,0.055) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[360px]">
        {/* Logo mark */}
        <div className="mb-10 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-card-bg">
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
            /* ── Sent confirmation ─────────────────────────────────── */
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 text-center"
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-accent/25 bg-accent/10">
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
            /* ── Login form ────────────────────────────────────────── */
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-10"
            >
              <div className="space-y-2">
                <h1 className="text-[26px] font-medium leading-tight tracking-[-0.02em] text-text-primary">
                  Sign in to<br />Studio OS
                </h1>
                <p className="text-[13px] text-text-tertiary">
                  No password. We&apos;ll email you a magic link.
                </p>
              </div>

              <div className="space-y-4">
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
              </div>

              <button
                type="submit"
                disabled={!email.trim() || state === "loading"}
                className={cn(
                  "w-full rounded-md py-2.5 text-sm font-medium transition-[opacity,background-color] duration-200 ease-out",
                  email.trim() && state !== "loading"
                    ? "bg-accent text-white hover:opacity-90"
                    : "cursor-not-allowed bg-accent/15 text-white/25"
                )}
              >
                {state === "loading" ? "Sending…" : "Send magic link"}
              </button>
            </motion.form>
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
