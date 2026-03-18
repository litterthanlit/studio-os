"use client";

import * as React from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Layers,
  Layout,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Role = "host" | "controller";
type ConnectionStatus = "disconnected" | "connecting" | "connected";

function generateClientId(): string {
  if (typeof window === "undefined") return "";
  const stored = sessionStorage.getItem("remote-client-id");
  if (stored) return stored;
  const id = `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem("remote-client-id", id);
  return id;
}

export function RemoteControlPage() {
  const [role, setRole] = React.useState<Role | null>(null);
  const [status, setStatus] = React.useState<ConnectionStatus>("disconnected");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [sessionCode, setSessionCode] = React.useState<string | null>(null);
  const [joinCode, setJoinCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [controllerConnected, setControllerConnected] = React.useState(false);
  const [lastCommand, setLastCommand] = React.useState<string | null>(null);
  const clientId = React.useMemo(() => generateClientId(), []);
  const eventSourceRef = React.useRef<EventSource | null>(null);

  const cleanup = React.useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  React.useEffect(() => cleanup, [cleanup]);

  const connectSSE = React.useCallback(
    (sid: string) => {
      cleanup();
      const es = new EventSource(
        `/api/remote/events?sessionId=${sid}&clientId=${clientId}`
      );
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "connected") {
            setStatus("connected");
          } else if (data.type === "controller-joined") {
            setControllerConnected(true);
          } else if (data.type === "command") {
            setLastCommand(
              `${data.command.type}: ${JSON.stringify(data.command.payload)}`
            );
            // Dispatch a custom event so the canvas can listen
            window.dispatchEvent(
              new CustomEvent("remote-command", { detail: data.command })
            );
          } else if (data.type === "session-ended") {
            setStatus("disconnected");
            setSessionId(null);
            setSessionCode(null);
            setRole(null);
            cleanup();
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setStatus("disconnected");
      };
    },
    [clientId, cleanup]
  );

  async function handleCreate() {
    setError(null);
    setStatus("connecting");
    try {
      const res = await fetch("/api/remote/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessionId(data.sessionId);
      setSessionCode(data.code);
      setRole("host");
      connectSSE(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setStatus("disconnected");
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setError(null);
    setStatus("connecting");
    try {
      const res = await fetch("/api/remote/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          clientId,
          code: joinCode.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessionId(data.sessionId);
      setSessionCode(data.code);
      setRole("controller");
      connectSSE(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session not found");
      setStatus("disconnected");
    }
  }

  async function handleDisconnect() {
    if (sessionId) {
      await fetch("/api/remote/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", clientId, sessionId }),
      }).catch(() => {});
    }
    cleanup();
    setStatus("disconnected");
    setSessionId(null);
    setSessionCode(null);
    setRole(null);
    setControllerConnected(false);
    setLastCommand(null);
    setError(null);
  }

  async function sendCommand(
    type: string,
    payload: Record<string, unknown>
  ) {
    if (!sessionId) return;
    try {
      await fetch("/api/remote/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, clientId, command: { type, payload } }),
      });
    } catch {
      // ignore
    }
  }

  function handleCopyCode() {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Landing — choose role
  if (status === "disconnected" && !role) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="w-full max-w-sm space-y-6 px-4">
          <div className="space-y-1 text-center">
            <h1 className="text-[22px] font-semibold text-[#1A1A1A]">
              Remote Control
            </h1>
            <p className="text-[13px] text-[#6B6B6B]">
              Mirror your canvas between devices
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCreate}
              className={cn(
                "flex w-full items-center gap-3 rounded-[4px] border border-[#E5E5E0] bg-white p-4",
                "transition-colors hover:border-[#D1E4FC] hover:bg-[#F5F5F0]"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-[#D1E4FC]">
                <Monitor size={18} strokeWidth={1.5} className="text-[#1E5DF2]" />
              </div>
              <div className="text-left">
                <div className="text-[14px] font-medium text-[#1A1A1A]">
                  Host Display
                </div>
                <div className="text-[12px] text-[#6B6B6B]">
                  Show canvas on this screen, control from another device
                </div>
              </div>
            </button>

            <button
              onClick={() => setRole("controller")}
              className={cn(
                "flex w-full items-center gap-3 rounded-[4px] border border-[#E5E5E0] bg-white p-4",
                "transition-colors hover:border-[#D1E4FC] hover:bg-[#F5F5F0]"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-[#F5F5F0]">
                <Smartphone size={18} strokeWidth={1.5} className="text-[#1A1A1A]" />
              </div>
              <div className="text-left">
                <div className="text-[14px] font-medium text-[#1A1A1A]">
                  Controller
                </div>
                <div className="text-[12px] text-[#6B6B6B]">
                  Control a canvas running on another device
                </div>
              </div>
            </button>
          </div>

          {error && (
            <p className="text-center text-[12px] text-red-500">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Join screen for controller
  if (role === "controller" && status === "disconnected") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="w-full max-w-xs space-y-4 px-4">
          <div className="space-y-1 text-center">
            <h1 className="text-[17px] font-semibold text-[#1A1A1A]">
              Enter Session Code
            </h1>
            <p className="text-[13px] text-[#6B6B6B]">
              Enter the 6-character code shown on the host device
            </p>
          </div>

          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            className="text-center text-lg tracking-[0.3em] font-mono"
            maxLength={6}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setRole(null)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleJoin}
              disabled={joinCode.length < 6}
              className="flex-1"
            >
              Connect
            </Button>
          </div>

          {error && (
            <p className="text-center text-[12px] text-red-500">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Host display — waiting or connected
  if (role === "host") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="w-full max-w-sm space-y-6 px-4">
          <div className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2">
              {status === "connected" ? (
                <Wifi size={16} strokeWidth={1.5} className="text-green-600" />
              ) : (
                <WifiOff size={16} strokeWidth={1.5} className="text-[#A0A0A0]" />
              )}
              <span
                className={cn(
                  "text-[11px] font-medium uppercase tracking-wider",
                  status === "connected" ? "text-green-600" : "text-[#A0A0A0]"
                )}
              >
                {status === "connecting" ? "Connecting…" : status}
              </span>
            </div>

            <h1 className="text-[22px] font-semibold text-[#1A1A1A]">
              Host Display
            </h1>

            {sessionCode && (
              <div className="space-y-2 pt-2">
                <p className="text-[13px] text-[#6B6B6B]">
                  Enter this code on your controller device:
                </p>
                <button
                  onClick={handleCopyCode}
                  className={cn(
                    "mx-auto flex items-center gap-2 rounded-[4px] border border-[#E5E5E0] bg-white px-6 py-3",
                    "transition-colors hover:border-[#D1E4FC]"
                  )}
                >
                  <span className="font-mono text-2xl tracking-[0.4em] text-[#1A1A1A]">
                    {sessionCode}
                  </span>
                  {copied ? (
                    <Check size={14} className="text-green-600" />
                  ) : (
                    <Copy size={14} className="text-[#A0A0A0]" />
                  )}
                </button>
              </div>
            )}

            {controllerConnected && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-[12px] text-green-700">
                  Controller connected
                </span>
              </div>
            )}

            {lastCommand && (
              <div className="mt-4 rounded-[4px] border border-[#E5E5E0] bg-white p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#A0A0A0]">
                  Last Command
                </p>
                <p className="mt-1 font-mono text-[12px] text-[#1A1A1A]">
                  {lastCommand}
                </p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={handleDisconnect}
            className="w-full"
          >
            End Session
          </Button>
        </div>
      </div>
    );
  }

  // Controller — connected, show controls
  if (role === "controller" && status === "connected") {
    return (
      <div className="flex h-screen flex-col bg-[#FAFAF8]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E0] bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Wifi size={14} strokeWidth={1.5} className="text-green-600" />
            <span className="text-[13px] font-medium text-[#1A1A1A]">
              Remote Control
            </span>
          </div>
          <Button variant="ghost" onClick={handleDisconnect} className="h-7 px-2 text-[12px]">
            Disconnect
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stage Navigation */}
          <ControlSection label="Stage">
            <div className="grid grid-cols-2 gap-2">
              <ControlButton
                icon={<Layers size={16} strokeWidth={1.5} />}
                label="Collect"
                onClick={() => sendCommand("navigate-stage", { stage: "collect" })}
              />
              <ControlButton
                icon={<Layout size={16} strokeWidth={1.5} />}
                label="Compose"
                onClick={() => sendCommand("navigate-stage", { stage: "compose" })}
              />
            </div>
          </ControlSection>

          {/* Breakpoint Selection */}
          <ControlSection label="Breakpoint">
            <div className="grid grid-cols-3 gap-2">
              <ControlButton
                icon={<Monitor size={16} strokeWidth={1.5} />}
                label="Desktop"
                onClick={() => sendCommand("select-breakpoint", { breakpoint: "desktop" })}
              />
              <ControlButton
                icon={<Tablet size={16} strokeWidth={1.5} />}
                label="Tablet"
                onClick={() => sendCommand("select-breakpoint", { breakpoint: "tablet" })}
              />
              <ControlButton
                icon={<Smartphone size={16} strokeWidth={1.5} />}
                label="Mobile"
                onClick={() => sendCommand("select-breakpoint", { breakpoint: "mobile" })}
              />
            </div>
          </ControlSection>

          {/* Scroll / Pan */}
          <ControlSection label="Navigation">
            <div className="grid grid-cols-3 gap-2">
              <div />
              <ControlButton
                icon={<ArrowUp size={16} strokeWidth={1.5} />}
                label="Up"
                onClick={() => sendCommand("scroll-to", { direction: "up", amount: 200 })}
              />
              <div />
              <ControlButton
                icon={<ArrowLeft size={16} strokeWidth={1.5} />}
                label="Left"
                onClick={() => sendCommand("scroll-to", { direction: "left", amount: 200 })}
              />
              <ControlButton
                icon={<MousePointer size={14} strokeWidth={1.5} />}
                label="Center"
                onClick={() => sendCommand("scroll-to", { direction: "center" })}
              />
              <ControlButton
                icon={<ArrowRight size={16} strokeWidth={1.5} />}
                label="Right"
                onClick={() => sendCommand("scroll-to", { direction: "right", amount: 200 })}
              />
              <div />
              <ControlButton
                icon={<ArrowDown size={16} strokeWidth={1.5} />}
                label="Down"
                onClick={() => sendCommand("scroll-to", { direction: "down", amount: 200 })}
              />
              <div />
            </div>
          </ControlSection>

          {/* Zoom */}
          <ControlSection label="Zoom">
            <div className="grid grid-cols-2 gap-2">
              <ControlButton
                icon={<ZoomIn size={16} strokeWidth={1.5} />}
                label="Zoom In"
                onClick={() => sendCommand("zoom", { direction: "in" })}
              />
              <ControlButton
                icon={<ZoomOut size={16} strokeWidth={1.5} />}
                label="Zoom Out"
                onClick={() => sendCommand("zoom", { direction: "out" })}
              />
            </div>
          </ControlSection>

          {/* Panels */}
          <ControlSection label="Panels">
            <div className="grid grid-cols-2 gap-2">
              <ControlButton
                label="Layers"
                onClick={() => sendCommand("toggle-panel", { panel: "layers" })}
              />
              <ControlButton
                label="Inspector"
                onClick={() => sendCommand("toggle-panel", { panel: "inspector" })}
              />
            </div>
          </ControlSection>

          {/* Variant Selection */}
          <ControlSection label="Variants">
            <div className="grid grid-cols-2 gap-2">
              <ControlButton
                label="Previous"
                onClick={() => sendCommand("select-variant", { direction: "prev" })}
              />
              <ControlButton
                label="Next"
                onClick={() => sendCommand("select-variant", { direction: "next" })}
              />
            </div>
          </ControlSection>
        </div>
      </div>
    );
  }

  // Connecting state
  return (
    <div className="flex h-screen items-center justify-center bg-[#FAFAF8]">
      <div className="space-y-2 text-center">
        <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-[#E5E5E0] border-t-[#1E5DF2]" />
        <p className="text-[13px] text-[#6B6B6B]">Connecting…</p>
      </div>
    </div>
  );
}

function ControlSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[#A0A0A0]">
        {label}
      </p>
      {children}
    </div>
  );
}

function ControlButton({
  icon,
  label,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-[4px] border border-[#E5E5E0] bg-white px-3 py-3",
        "text-[12px] font-medium text-[#1A1A1A]",
        "transition-colors active:bg-[#D1E4FC] active:border-[#1E5DF2]",
        "hover:border-[#D1E4FC] hover:bg-[#F5F5F0]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
