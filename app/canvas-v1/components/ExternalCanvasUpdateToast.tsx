"use client";

type ExternalCanvasUpdateToastProps = {
  visible: boolean;
  onReload: () => void;
  onDismiss: () => void;
};

export function ExternalCanvasUpdateToast({
  visible,
  onReload,
  onDismiss,
}: ExternalCanvasUpdateToastProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 48,
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#1A1A1A",
        color: "#FFFFFF",
        fontSize: 12,
        borderRadius: 4,
        padding: "8px 12px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        whiteSpace: "nowrap",
        boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      }}
    >
      <span>Canvas updated externally</span>
      <button
        type="button"
        onClick={onReload}
        style={{
          backgroundColor: "#4B57DB",
          color: "#FFFFFF",
          border: "none",
          borderRadius: 4,
          padding: "4px 10px",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Reload
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: "#A0A0A0",
          fontSize: 16,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
