"use client";

type AgentCanvasPresenceProps = {
  visible: boolean;
  headline: string;
  meta: string;
};

export function AgentCanvasPresence({
  visible,
  headline,
  meta,
}: AgentCanvasPresenceProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-agent-presence="true"
      style={{
        position: "fixed",
        top: 62,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #EFEFEC",
        borderRadius: 4,
        padding: "6px 10px",
        pointerEvents: "none",
      }}
    >
      <span
        className="mono-kicker"
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: "#A0A0A0",
          lineHeight: 1,
        }}
      >
        {headline}
      </span>
      {meta ? (
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.4px",
            color: "#6B6B6B",
            lineHeight: 1,
          }}
        >
          {meta}
        </span>
      ) : null}
    </div>
  );
}
