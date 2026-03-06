"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs, slideUp } from "@/lib/animations";

type DeviceSize = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<DeviceSize, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

type ComponentPreviewProps = {
  code: string | null;
  loading: boolean;
};

export function ComponentPreview({ code, loading }: ComponentPreviewProps) {
  const [device, setDevice] = React.useState<DeviceSize>("desktop");
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const iframeContent = React.useMemo(() => {
    if (!code) return null;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1C1C1C;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 24px;
    }
    #root { width: 100%; }
  </style>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/framer-motion@11/dist/framer-motion.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    const { motion, AnimatePresence } = window["framer-motion"] || {};
    ${code.replace(
      /import\s+\{[^}]*\}\s+from\s+['"]framer-motion['"];?/g,
      ""
    ).replace(
      /import\s+React[^;]*from\s+['"]react['"];?/g,
      ""
    ).replace(
      /import\s+\{[^}]*\}\s+from\s+['"]react['"];?/g,
      ""
    )}

    const root = ReactDOM.createRoot(document.getElementById("root"));
    const _default = typeof exports !== 'undefined' ? exports.default : null;
    const Component = _default || (() => React.createElement("div", null, "Component rendered"));
    root.render(React.createElement(Component));
  <\/script>
  <script>
    window.addEventListener("error", (e) => {
      document.getElementById("root").innerHTML =
        '<div style="padding:24px;color:#ef4444;font-family:monospace;font-size:12px;white-space:pre-wrap">' +
        'Render Error:\\n' + e.message + '</div>';
    });
  <\/script>
</body>
</html>`;
  }, [code]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full"
        />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-text-secondary">
            Generating component...
          </p>
          <p className="text-[10px] text-text-muted font-mono">
            AI is writing React + Framer Motion code
          </p>
        </div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="font-mono text-text-muted/30 text-[40px] leading-none select-none">
          {"< />"}
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm text-text-tertiary">
            Your generated component will appear here
          </p>
          <p className="text-[10px] text-text-muted">
            Build a design system first, then describe what you want to create
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      {...slideUp}
      transition={springs.smooth}
      className="flex-1 flex flex-col"
    >
      {/* Device toggle */}
      <div className="flex items-center justify-center gap-1 mb-3 pb-3 border-b border-border-subtle">
        {(["desktop", "tablet", "mobile"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDevice(d)}
            className={cn(
              "px-3 py-1 text-[10px] uppercase tracking-[0.12em] font-medium transition-colors",
              device === d
                ? "bg-bg-tertiary text-text-primary border border-border-primary"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {d === "desktop" && "🖥 "}
            {d === "tablet" && "📱 "}
            {d === "mobile" && "📲 "}
            {d}
          </button>
        ))}
      </div>

      {/* Preview frame */}
      <div className="flex-1 flex items-start justify-center overflow-auto bg-bg-tertiary/50 border border-border-primary rounded-lg p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={device}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={springs.smooth}
            className="border border-border-primary bg-[#1C1C1C] shadow-lg overflow-hidden"
            style={{
              width: DEVICE_WIDTHS[device],
              maxWidth: "100%",
              minHeight: 400,
            }}
          >
            {iframeContent && (
              <iframe
                ref={iframeRef}
                srcDoc={iframeContent}
                className="w-full border-0"
                style={{ minHeight: 400, height: "auto" }}
                sandbox="allow-scripts allow-same-origin"
                title="Component Preview"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
