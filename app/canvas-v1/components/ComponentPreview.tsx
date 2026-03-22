"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs, slideUp } from "@/lib/animations";
import type { DesignSystemTokens } from "@/lib/canvas/generate-system";

type DeviceSize = "desktop" | "mobile";

const DEVICES: { key: DeviceSize; label: string; width: number; icon: string }[] = [
  { key: "desktop", label: "Desktop", width: 1440, icon: "\u229E" },
  { key: "mobile",  label: "Mobile",  width: 375,  icon: "\u22A1" },
];

type SectionEntry = { id: string; label: string };

type ComponentPreviewProps = {
  code: string | null;
  tokens: DesignSystemTokens | null;
  loading: boolean;
};

function tokensToCSS(tokens: DesignSystemTokens): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(tokens.colors))
    lines.push("--color-" + k + ": " + v + ";");
  lines.push("--font-heading: " + tokens.typography.fontFamily + ";");
  lines.push("--font-body: " + tokens.typography.fontFamily + ";");
  for (const [k, v] of Object.entries(tokens.typography.scale))
    lines.push("--font-" + k + ": " + v + ";");
  const spaceMap: Record<string, string> = {
    "1": "xs", "2": "sm", "4": "md", "8": "lg", "12": "xl", "16": "2xl",
  };
  for (const [k, v] of Object.entries(tokens.spacing.scale)) {
    const alias = spaceMap[k];
    if (alias) lines.push("--space-" + alias + ": " + v + ";");
  }
  for (const [k, v] of Object.entries(tokens.radii))
    lines.push("--radius-" + k + ": " + v + ";");
  for (const [k, v] of Object.entries(tokens.shadows))
    lines.push("--shadow-" + k + ": " + v + ";");
  return lines.join("\n    ");
}

function prepareCode(code: string): string {
  let c = code
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, "");

  const m = c.match(/export\s+default\s+function\s+(\w+)/);
  if (m) {
    c = c.replace(/export\s+default\s+function\s+(\w+)/, "function $1");
    c += "\nwindow.__PREVIEW_COMPONENT__ = " + m[1] + ";";
  } else {
    c = c.replace(/export\s+default\s+(\w+)\s*;?/g, "window.__PREVIEW_COMPONENT__ = $1;");
    c = c.replace(/^export\s+/gm, "");
  }
  return c;
}

export function buildIframeHTML(
  code: string,
  tokens: DesignSystemTokens | null,
  previewId = "preview"
): string {
  const cssVars = tokens ? tokensToCSS(tokens) : "";
  const bgColor = tokens?.colors.background || "#0a0a0a";
  const textColor = tokens?.colors.text || "#ffffff";
  const fontFamily = tokens?.typography.fontFamily
    || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const prepared = prepareCode(code);
  const escaped = JSON.stringify(prepared);
  const escapedPreviewId = JSON.stringify(previewId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  :root { ${cssVars} }
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{font-family:${fontFamily};background:${bgColor};color:${textColor};min-height:100vh;overflow-y:auto;overflow-x:hidden;-webkit-font-smoothing:antialiased}
  #root{width:100%;min-height:100vh}
  #__err{display:none;position:fixed;inset:0;z-index:99999;background:rgba(10,10,10,.96);padding:32px;overflow:auto;flex-direction:column;gap:12px}
  #__err.on{display:flex}
  #__err h3{color:#ef4444;font-size:14px;font-weight:600;font-family:monospace}
  #__err pre{color:#fca5a5;font-size:11px;line-height:1.6;white-space:pre-wrap;word-break:break-word;font-family:monospace}
  #__err button{align-self:flex-start;background:#ef4444;color:#fff;border:none;padding:6px 16px;font-size:11px;cursor:pointer;font-family:monospace;text-transform:uppercase;letter-spacing:.08em}
  #__ld{position:fixed;inset:0;z-index:99998;background:${bgColor};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
  #__ld .sp{width:24px;height:24px;border:2px solid rgba(128,128,128,.2);border-top-color:rgba(128,128,128,.7);border-radius:50%;animation:spin .8s linear infinite}
  #__ld .tx{font-size:11px;color:rgba(128,128,128,.6);font-family:monospace;text-transform:uppercase;letter-spacing:.12em}
  #__ld .ct{font-size:9px;color:rgba(128,128,128,.4);font-family:monospace}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div id="__ld"><div class="sp"></div><div class="tx">Rendering page\u2026</div><div class="ct" id="__ldst">Loading libraries\u2026</div></div>
<div id="__err"><h3>Render Error</h3><pre id="__msg"></pre><button onclick="this.parentElement.classList.remove('on')">Dismiss</button></div>
<div id="root"></div>
<script>
var __loaded=0,__need=4,__libNames=["React","ReactDOM","Framer Motion","Babel"];
var __previewId=${escapedPreviewId};
var __ldst=null;
function __updSt(m){__ldst=__ldst||document.getElementById("__ldst");if(__ldst)__ldst.textContent=m;}
setTimeout(function(){if(__loaded<__need)__showErr("Timed out loading libraries ("+__loaded+"/"+__need+" loaded).\\nCheck your network connection.");},18000);
function __showErr(m){
  document.getElementById("__ld").style.display="none";
  document.getElementById("__msg").textContent=m;
  document.getElementById("__err").classList.add("on");
  try{window.parent.postMessage({type:"preview-error",error:m,previewId:__previewId},"*")}catch(x){}
}
function __onLib(){
  __loaded++;
  __updSt("Loaded "+__loaded+"/"+__need+" libraries\u2026");
  try{window.parent.postMessage({type:"preview-progress",loaded:__loaded,need:__need,previewId:__previewId},"*")}catch(x){}
  if(__loaded<__need)return;
  __updSt("Transpiling\u2026");
  __run();
}
function __onLibErr(name){
  __showErr("Failed to load "+name+" from CDN.\\nCheck your network connection.");
}
function __scanSections(){
  var secs=[],seen={};
  var els=document.querySelectorAll("section[id],[data-section],div[id]");
  for(var i=0;i<els.length;i++){
    var e=els[i],sid=e.id||e.getAttribute("data-section")||"";
    if(!sid||sid==="root"||sid.indexOf("__")===0||seen[sid])continue;
    seen[sid]=true;
    var h=e.querySelector("h1,h2,h3");
    secs.push({id:sid,label:h?h.textContent.trim().slice(0,40):sid.replace(/[-_]/g," ")});
  }
  if(!secs.length){
    var ss=document.querySelectorAll("section");
    for(var j=0;j<ss.length;j++){
      var s=ss[j],hd=s.querySelector("h1,h2,h3");
      if(!s.id)s.id="section-"+j;
      secs.push({id:s.id,label:hd?hd.textContent.trim().slice(0,40):"Section "+(j+1)});
    }
  }
  try{window.parent.postMessage({type:"preview-sections",sections:secs,previewId:__previewId},"*")}catch(x){}
}
window.addEventListener("message",function(ev){
  if(ev.data&&ev.data.type==="scroll-to-section"){
    var t=document.getElementById(ev.data.id);
    if(t)t.scrollIntoView({behavior:"smooth",block:"start"});
  }
});
function __run(){
  try{
    __updSt("Transpiling code\u2026");
    var code=${escaped};
    var transformed=Babel.transform(code,{presets:["react","typescript"],filename:"page.tsx"}).code;
    __updSt("Initializing component\u2026");
    var fm=window["framer-motion"]||{};
    var header="var motion=this.motion||{div:'div',span:'span',section:'section',p:'p',h1:'h1',h2:'h2',h3:'h3',h4:'h4',nav:'nav',footer:'footer',header:'header',button:'button',ul:'ul',li:'li',a:'a',img:'img'},AnimatePresence=this.AP||function(p){return p.children},useAnimation=this.uA||function(){return{}},useInView=this.uIV||function(){return[null,false]},useScroll=this.uS||function(){return{scrollYProgress:{current:0}}},useTransform=this.uT||function(v){return v},useState=React.useState,useEffect=React.useEffect,useRef=React.useRef,useMemo=React.useMemo,useCallback=React.useCallback;\\n";
    var fn=new Function(header+transformed);
    fn.call({motion:fm.motion,AP:fm.AnimatePresence,uA:fm.useAnimation,uIV:fm.useInView,uS:fm.useScroll,uT:fm.useTransform});
    var C=window.__PREVIEW_COMPONENT__;
    if(typeof C!=="function"){
      __showErr("No default-exported React component found.\\nMake sure the code has: export default function PageName() { ... }");
      return;
    }
    __updSt("Rendering\u2026");
    // Error boundary class to catch runtime crashes in generated sections
    function EB(props){React.Component.call(this,props);this.state={hasError:false,error:null};}
    EB.prototype=Object.create(React.Component.prototype);
    EB.prototype.constructor=EB;
    EB.getDerivedStateFromError=function(err){return{hasError:true,error:err}};
    EB.prototype.componentDidCatch=function(){};
    EB.prototype.render=function(){
      if(this.state.hasError){
        var msg=this.state.error?this.state.error.message:"Unknown render error";
        return React.createElement("div",{style:{padding:"24px",margin:"12px 0",borderRadius:"12px",border:"1px solid rgba(239,68,68,0.3)",background:"rgba(239,68,68,0.08)"}},
          React.createElement("p",{style:{fontSize:"12px",color:"#ef4444",fontFamily:"monospace",margin:0}},"Render error: "+msg)
        );
      }
      return this.props.children;
    };
    var Wrapped=function(){return React.createElement(EB,null,React.createElement(C))};
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Wrapped));
    document.getElementById("__ld").style.display="none";
    try{window.parent.postMessage({type:"preview-ready",previewId:__previewId},"*")}catch(x){}
    setTimeout(__scanSections,600);
  }catch(err){
    __showErr(err.message||"Unknown error during render");
  }
}
</script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" onload="__onLib()" onerror="__onLibErr('React')"><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" onload="__onLib()" onerror="__onLibErr('ReactDOM')"><\/script>
<script src="https://unpkg.com/framer-motion@11/dist/framer-motion.js" onload="__onLib()" onerror="__onLibErr('Framer Motion')"><\/script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js" onload="__onLib()" onerror="__onLibErr('Babel')"><\/script>
</body>
</html>`;
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-center gap-1 py-3 border-b border-[#E5E5E0]">
        {DEVICES.map((d) => (
          <div key={d.key} className="w-20 h-6 bg-[#E5E5E0] rounded animate-pulse" />
        ))}
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[140px] shrink-0 border-r border-[#E5E5E0] p-3 space-y-2">
          {[75, 90, 60, 85, 70].map((w, i) => (
            <div key={i} className="h-5 bg-[#E5E5E0] rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#E5E5E0]/30">
          <div className="text-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 mx-auto border-2 border-[#1E5DF2] border-t-transparent rounded-full"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#6B6B6B]">Generating page...</p>
              <p className="text-[10px] text-[#A0A0A0] font-mono">AI is writing a full React + Framer Motion site</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {["Hero", "Features", "Pricing", "CTA"].map((s) => (
                <span key={s} className="px-2 py-0.5 bg-[#E5E5E0] border border-[#E5E5E0] text-[9px] font-mono text-[#A0A0A0] uppercase tracking-wider animate-pulse">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ComponentPreview({ code, tokens, loading }: ComponentPreviewProps) {
  const previewId = React.useId();
  const [device, setDevice] = React.useState<DeviceSize>("desktop");
  const [sections, setSections] = React.useState<SectionEntry[]>([]);
  const [activeSection, setActiveSection] = React.useState<string | null>(null);
  const [renderError, setRenderError] = React.useState<string | null>(null);
  const [iframeReady, setIframeReady] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.previewId !== previewId) return;
      if (e.data.type === "preview-sections") setSections(e.data.sections || []);
      else if (e.data.type === "preview-ready") { setIframeReady(true); setRenderError(null); }
      else if (e.data.type === "preview-error") { setRenderError(e.data.error); setIframeReady(true); }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [previewId]);

  React.useEffect(() => {
    setSections([]);
    setRenderError(null);
    setIframeReady(false);
  }, [code]);

  function scrollToSection(id: string) {
    setActiveSection(id);
    iframeRef.current?.contentWindow?.postMessage({ type: "scroll-to-section", id }, "*");
  }

  const iframeHTML = React.useMemo(() => {
    if (!code) return null;
    return buildIframeHTML(code, tokens, previewId);
  }, [code, tokens, previewId]);

  if (loading) return <LoadingSkeleton />;

  if (!code) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="font-mono text-[#A0A0A0]/20 text-[52px] leading-none select-none tracking-tight">
          {"<page />"}
        </div>
        <div className="text-center space-y-1 max-w-xs">
          <p className="text-sm text-[#A0A0A0]">Your generated site will preview here</p>
          <p className="text-[10px] text-[#A0A0A0] leading-relaxed">
            Describe a full page &mdash; the AI will generate a scrollable, multi-section
            site using your design system tokens and Framer Motion
          </p>
        </div>
      </div>
    );
  }

  const activeDevice = DEVICES.find((d) => d.key === device)!;

  return (
    <motion.div {...slideUp} transition={springs.smooth} className="flex-1 flex flex-col min-h-0">
      {/* Device toggle */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-[#E5E5E0]">
        <div className="flex items-center gap-1">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDevice(d.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-[0.12em] font-medium transition-colors rounded-sm",
                device === d.key
                  ? "bg-[#E5E5E0] text-[#1A1A1A] border border-[#E5E5E0]"
                  : "text-[#A0A0A0] hover:text-[#6B6B6B]"
              )}
            >
              <span className="font-mono text-[9px] opacity-60">{d.icon}</span>
              {d.label}
              <span className="font-mono text-[9px] text-[#A0A0A0]/50">{d.width}</span>
            </button>
          ))}
        </div>
        {renderError && (
          <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Error
          </span>
        )}
        {iframeReady && !renderError && (
          <span className="flex items-center gap-1 text-[10px] text-green-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />Live
          </span>
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <AnimatePresence>
          {sections.length > 0 && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 140, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={springs.smooth}
              className="shrink-0 border-r border-[#E5E5E0] bg-white overflow-y-auto overflow-x-hidden"
            >
              <div className="p-2 space-y-0.5">
                <span className="block px-2 py-1 text-[9px] uppercase tracking-[0.15em] font-medium text-[#A0A0A0]">Sections</span>
                {sections.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => scrollToSection(s.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 text-left text-[10px] rounded-sm transition-colors truncate",
                      activeSection === s.id
                        ? "bg-accent-subtle text-accent font-medium"
                        : "text-[#A0A0A0] hover:text-[#6B6B6B] hover:bg-[#F5F5F0]"
                    )}
                  >
                    <span className="font-mono text-[8px] text-[#A0A0A0]/50 shrink-0 w-3">{i + 1}</span>
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto bg-[#E5E5E0]/30">
          <div className="mx-auto h-full" style={{ width: device === "desktop" ? "100%" : activeDevice.width }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={device}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={springs.smooth}
                className={cn("h-full mx-auto overflow-hidden", device !== "desktop" && "border-x border-[#E5E5E0] shadow-lg")}
                style={{ maxWidth: activeDevice.width, width: "100%" }}
              >
                {iframeHTML && (
                  <iframe
                    ref={iframeRef}
                    srcDoc={iframeHTML}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                    title="Site Preview"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
