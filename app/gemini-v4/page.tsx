"use client";

import React, { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Check, Box, Layers, MousePointer2, Sparkles, Code2, Monitor, ArrowRight } from "lucide-react";

// SPRING CONSTANTS for animation-magic
const SPRING = { type: "spring" as const, stiffness: 120, damping: 20 };
const SPRING_SLOW = { type: "spring" as const, stiffness: 80, damping: 20 };

export default function GeminiV4Page() {
  return (
    <main className="min-h-screen bg-[#0C0C14] text-[#FAFAFA] font-sans antialiased selection:bg-[#4B57DB]/40 overflow-hidden relative">
      <div 
        className="fixed inset-0 pointer-events-none opacity-20 mix-blend-screen z-0"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />
      
      <Nav />
      <Hero />
      <FunFeatures />
      <TasteEngine />
      <EditorMockup />
      <ExportSection />
      <Footer />
    </main>
  );
}

// ==========================================
// 1. NAVIGATION
// ==========================================
function Nav() {
  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={SPRING}
      className="fixed top-0 w-full h-14 flex items-center justify-between px-6 bg-[#0C0C14]/80 backdrop-blur-md border-b border-white/10 z-50"
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-[#4B57DB] rounded-[4px] flex items-center justify-center text-[10px] font-bold text-white tracking-widest pl-0.5">S</div>
        <span className="font-semibold text-sm tracking-tight text-white">Studio OS</span>
      </div>
      
      <div className="hidden md:flex items-center gap-6">
        <div className="-m-2 p-2 focus-within:ring-2 focus-within:ring-[#4B57DB] rounded">
          <a href="#taste" className="text-[13px] text-[#A0A0A0] hover:text-white transition-colors outline-none cursor-pointer">Taste Engine</a>
        </div>
        <div className="-m-2 p-2 focus-within:ring-2 focus-within:ring-[#4B57DB] rounded">
          <a href="#editor" className="text-[13px] text-[#A0A0A0] hover:text-white transition-colors outline-none cursor-pointer">The Editor</a>
        </div>
        <div className="-m-2 p-2 focus-within:ring-2 focus-within:ring-[#4B57DB] rounded">
          <a href="#export" className="text-[13px] text-[#A0A0A0] hover:text-white transition-colors outline-none cursor-pointer">Zero Lock-in</a>
        </div>
      </div>

      <button type="button" className="text-[12px] font-medium text-white bg-[#4B57DB] px-4 h-8 rounded-md hover:bg-[#4B57DB]/80 transition-colors focus:ring-2 focus:ring-[#4B57DB] focus:ring-offset-2 outline-none">
        Get Access
      </button>
    </motion.nav>
  );
}

// ==========================================
// 2. HERO
// ==========================================
function Hero() {
  return (
    <section className="relative pt-48 pb-32 px-6 flex flex-col items-center text-center z-10 w-full max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay: 0.1 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-[#1A1A1A] font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0] mb-6 shadow-sm"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#4B57DB] animate-pulse" />
        Now in early access
      </motion.div>

      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.2 }}
        className="font-serif text-[clamp(42px,6vw,68px)] leading-[1.05] tracking-tight mb-4 max-w-[700px] text-balance text-white"
      >
        AI that designs <br/>
        like <span className="text-[#4B57DB] italic tracking-normal">you</span>.
      </motion.h1>

      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.3 }}
        className="text-[16px] font-light text-[#A0A0A0] leading-relaxed max-w-[500px] mb-8 text-balance"
      >
        Feed Studio OS your references. It extracts your design sensibility and generates pages that look like yours — not like everyone else&apos;s.
      </motion.p>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.4 }}
        className="flex gap-4 items-center"
      >
        <button type="button" className="text-[13px] font-medium text-white bg-[#4B57DB] px-6 h-11 rounded-[6px] transition-all hover:bg-[#4B57DB]/80 hover:scale-[1.02] active:scale-[0.98] shadow-sm focus:ring-2 focus:ring-[#4B57DB] focus:ring-offset-2 outline-none">
          Start designing
        </button>
        <a href="#features" className="text-[13px] font-medium text-[#A0A0A0] px-4 h-11 rounded-[6px] inline-flex items-center gap-1.5 hover:text-white group transition-colors focus:ring-2 focus:ring-[#4B57DB] outline-none">
          See how it works <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </motion.div>
    </section>
  );
}

// ==========================================
// 3. PLAYFUL MARKETING CARDS
// ==========================================
function FunFeatures() {
  return (
    <section className="w-full py-24 bg-[#0C0C14] relative z-10" id="features">
      <div className="flex items-center gap-4 mb-16 w-full max-w-5xl px-6 mx-auto opacity-60">
        <div className="flex-1 h-[1px] bg-white/10" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">Features</span>
        <div className="flex-1 h-[1px] bg-white/10" />
      </div>

      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1 */}
        <motion.div whileHover={{ y: -4 }} className="bg-[#141414] border border-white/10 rounded-[6px] p-6 flex flex-col justify-between aspect-square relative overflow-hidden group">
          <h3 className="font-serif text-white text-xl leading-tight mb-4 z-10">Shared Canvas.<br/>Individual Flow.</h3>
          <div className="relative flex-grow flex items-end justify-center pb-0 z-10">
            <div className="w-full h-[80%] bg-[#0C0C14] border border-white/10 rounded-t-[4px] shadow-sm flex relative overflow-hidden">
               <div className="w-[30%] h-full border-r border-white/5 bg-[#141414]" />
               <div className="flex-grow bg-[#0C0C14] flex items-center justify-center relative" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '8px 8px' }}>
                 <MousePointer2 className="absolute top-[30%] left-[30%] w-4 h-4 text-[#FFB267] fill-[#FFB267] drop-shadow-md" />
                 <MousePointer2 className="absolute top-[50%] left-[45%] w-4 h-4 text-[#FF7A59] fill-[#FF7A59] drop-shadow-md" />
               </div>
            </div>
          </div>
          <p className="font-sans text-[#A0A0A0] text-[13px] mt-4 z-10">Collaborate in real-time without friction.</p>
        </motion.div>

        {/* Card 2 */}
        <motion.div whileHover={{ y: -4 }} className="bg-[#4B57DB]/20 border border-[#4B57DB]/30 rounded-[6px] p-6 flex flex-col justify-between aspect-square relative overflow-hidden">
          <h3 className="font-serif text-[#D1E4FC] text-xl leading-tight mb-4 z-10">Immutable Logic.<br/>Predicted State.</h3>
          <div className="relative flex-grow flex items-center justify-center z-10">
            <div className="w-full h-12 bg-[#0C0C14] border border-[#4B57DB]/50 rounded-[4px] flex items-center px-3 font-mono text-[10px] text-[#4B57DB]">
              &lt;DesignNode /&gt;
            </div>
          </div>
          <p className="font-sans text-[#D1E4FC]/70 text-[13px] mt-4 z-10">Clean, predictable component architecture.</p>
        </motion.div>

        {/* Card 3 */}
        <motion.div whileHover={{ y: -4 }} className="bg-[#4B57DB] border border-[#4B57DB] rounded-[6px] p-6 flex flex-col justify-between aspect-square relative overflow-hidden">
          <h3 className="font-serif text-white text-xl leading-tight mb-4 z-10">Intent,<br/>Mapped.</h3>
          <div className="relative flex-grow flex items-center justify-center z-10">
            <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white/20" />
            </div>
          </div>
          <p className="font-sans text-white/70 text-[13px] mt-4 z-10">We extract your aesthetic DNA.</p>
        </motion.div>

        {/* Card 4 */}
        <motion.div whileHover={{ y: -4 }} className="bg-[#141414] border border-white/10 rounded-[6px] p-6 flex flex-col justify-between aspect-square relative overflow-hidden">
          <h3 className="font-serif text-white text-xl leading-tight mb-4 z-10">Prompt.<br/>Generate.<br/>Refine.</h3>
          <div className="relative flex-grow flex items-end justify-center z-10">
            <div className="w-full h-[60%] bg-[#0C0C14] border border-white/10 rounded-t-[4px] p-3 flex flex-col gap-2">
              <div className="w-full h-2 bg-white/5 rounded-full" />
              <div className="w-[60%] h-2 bg-white/5 rounded-full" />
              <div className="w-full h-1 bg-[#4B57DB] rounded-full mt-auto" />
            </div>
          </div>
          <p className="font-sans text-[#A0A0A0] text-[13px] mt-4 z-10">Iterative generation at scale.</p>
        </motion.div>

      </div>
    </section>
  );
}

// ==========================================
// 4. THE TASTE ENGINE
// ==========================================
function TasteEngine() {
  return (
    <section id="taste" className="py-32 relative z-10 bg-[#0C0C14]">
      <div className="flex items-center gap-4 mb-16 w-full max-w-5xl px-6 mx-auto opacity-60">
        <div className="flex-1 h-[1px] bg-white/10" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#A0A0A0]">Process Extraction</span>
        <div className="flex-1 h-[1px] bg-white/10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl px-6 mx-auto">
        
        {/* Step 1: Moodboard */}
        <div className="bg-[#141414] border border-white/10 rounded-[6px] p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#4B57DB]/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-[#4B57DB]/20 transition-colors duration-500" />
          <div className="w-full aspect-[4/3] bg-[#0C0C14] border border-white/10 rounded-[4px] mb-5 flex items-center justify-center relative overflow-hidden">
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-[#4B57DB]/5" 
            />
            <div className="grid grid-cols-2 gap-1.5 p-3 w-full h-full">
              <div className="bg-white/5 rounded-sm border border-white/5 shadow-xs" />
              <div className="grid grid-rows-2 gap-1.5">
                <div className="bg-white/5 rounded-sm border border-white/5 shadow-xs" />
                <div className="bg-white/5 rounded-sm border border-white/5 shadow-xs" />
              </div>
            </div>
            {/* Scanning Laser */}
            <motion.div 
              animate={{ y: ["-100%", "300%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[80px] bg-gradient-to-b from-transparent to-[#4B57DB]/20 border-b border-[#4B57DB]/50 pointer-events-none"
            />
          </div>
          <h3 className="font-serif text-white text-lg mb-2">1. Upload References</h3>
          <p className="text-[13px] text-[#A0A0A0] leading-relaxed">Drop in screenshots, moodboards, or live URLs. Studio OS analyzes them visually.</p>
        </div>

        {/* Step 2: Extraction */}
        <div className="bg-[#141414] border border-white/10 rounded-[6px] p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFB267]/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-[#FFB267]/20 transition-colors duration-500" />
          <div className="w-full aspect-[4/3] bg-[#0C0C14] border border-white/10 rounded-[4px] mb-5 flex flex-col p-4 gap-2.5 items-center justify-center">
            {/* Tokens UI */}
            <motion.div className="w-full bg-[#1A1A1A] border border-white/10 rounded p-2 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-[#FAFAFA] border border-white/20 shadow-sm" />
              <div className="flex flex-col items-start gap-1">
                <div className="w-16 h-1.5 bg-white/20 rounded-full" />
                <span className="font-mono text-[9px] text-[#FAFAFA]/70 tracking-tight">--bg-primary</span>
              </div>
            </motion.div>
            <motion.div className="w-full bg-[#1A1A1A] border border-white/10 rounded p-2 flex items-center gap-3 ml-4">
              <div className="w-4 h-4 rounded-sm border border-[#A0A0A0]/30 shadow-sm flex items-center justify-center font-serif text-[10px] text-white">Ag</div>
              <div className="flex flex-col items-start gap-1">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                <span className="font-mono text-[9px] text-[#FAFAFA]/70 tracking-tight">--font-serif</span>
              </div>
            </motion.div>
          </div>
          <h3 className="font-serif text-white text-lg mb-2">2. Taste Engine</h3>
          <p className="text-[13px] text-[#A0A0A0] leading-relaxed">We extract your exact design tokens: typography, color logic, and spatial grids.</p>
        </div>

        {/* Step 3: Generation */}
        <div className="bg-[#141414] border border-white/10 rounded-[6px] p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF7A59]/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-[#FF7A59]/20 transition-colors duration-500" />
          <div className="w-full aspect-[4/3] bg-[#0C0C14] border border-white/10 rounded-[4px] mb-5 flex items-center justify-center p-4">
            <div className="w-full h-full bg-[#1A1A1A] border border-white/10 rounded-sm shadow-sm flex flex-col">
              <div className="h-3 border-b border-white/10 flex items-center px-1.5 gap-1">
                <div className="w-1 h-1 rounded-full bg-[#FF5F56]/60" />
                <div className="w-1 h-1 rounded-full bg-[#FEBC2E]/60" />
                <div className="w-1 h-1 rounded-full bg-[#27C840]/60" />
              </div>
              <div className="flex-1 p-2 flex flex-col gap-1.5 justify-center">
                <motion.div className="h-2.5 bg-white/10 rounded-sm w-[40%]" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                <div className="h-1 bg-white/5 rounded-full w-[80%]" />
                <div className="h-1 bg-white/5 rounded-full w-[60%]" />
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <div className="h-6 bg-white/5 rounded-sm" />
                  <div className="h-6 bg-[#4B57DB]/20 border border-[#4B57DB]/30 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
          <h3 className="font-serif text-white text-lg mb-2">3. Component Build</h3>
          <p className="text-[13px] text-[#A0A0A0] leading-relaxed">It streams out fully responsive, layout-perfect React components inside our editor.</p>
        </div>

      </div>
    </section>
  );
}

// ==========================================
// 5. EDITOR MOCKUP
// ==========================================
function EditorMockup() {
  return (
    <section id="editor" className="py-32 bg-[#0C0C14] relative z-10 border-t border-white/10">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col items-center">
        
        <div className="text-center mb-16">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#4B57DB] font-semibold mb-4">The Real Editor</div>
          <h2 className="font-serif text-4xl tracking-tight mb-4 text-white">Dark Chrome. Light Canvas.</h2>
          <p className="text-[#A0A0A0] text-[15px] max-w-[500px] mx-auto">No generic text boxes here. This is a real node-based editor with Fill/Hug semantics, layer hierarchies, and unconstrained freedom.</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ type: "spring", stiffness: 80, damping: 25 }}
          className="w-full max-w-[1000px] h-[600px] bg-[#141414] rounded-[8px] overflow-hidden border border-white/10 shadow-2xl flex flex-col"
        >
          <div className="h-10 border-b border-white/5 bg-[#141414] flex items-center px-4 gap-3 shrink-0">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#27C840]/80" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 px-3 py-1 bg-[#0C0C14] border border-white/5 rounded-[4px]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4B57DB]" />
                <span className="font-mono text-[9px] text-[#A0A0A0]">studio-os.app/home</span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-[180px] bg-[#141414] border-r border-white/5 flex flex-col font-mono text-[9px] text-[#A0A0A0] shrink-0">
              <div className="px-3 py-2 border-b border-white/5 text-[8px] uppercase tracking-widest text-[#FAFAFA]">Layers</div>
              <div className="p-2 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 px-1 py-0.5"><Box className="w-3 h-3" /> Page</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 pl-4"><Layers className="w-3 h-3" /> Hero Section</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 pl-7 bg-[#4B57DB]/20 text-white rounded-[2px] border border-[#4B57DB]/30"><Box className="w-3 h-3" /> Heading</div>
                <div className="flex items-center gap-1.5 px-1 py-0.5 pl-7"><Box className="w-3 h-3" /> Subtitle</div>
              </div>
            </div>

            <div className="flex-1 bg-[#0C0C14] relative flex items-center justify-center border-r border-white/5" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
              <div className="absolute top-2 left-2 text-[8px] font-mono text-[#4B57DB] px-1 py-0.5">App Router Render</div>
              <div className="w-[70%] aspect-video bg-[#0C0C14] border border-[#4B57DB] rounded-[2px] shadow-lg relative flex flex-col items-center justify-center p-6">
                <div className="absolute -top-4 -left-[1px] bg-[#4B57DB] px-1.5 py-0.5 text-[7px] text-white font-mono uppercase tracking-widest rounded-t-[2px]">Heading</div>
                
                <h1 className="font-serif text-[clamp(20px,3vw,32px)] text-white text-center leading-tight mb-2">Design at the<br/>speed of thought</h1>
                <p className="text-[10px] text-[#A0A0A0] text-center">A new approach to creative tools</p>

                <div className="absolute -top-1 -left-1 w-2 h-2 border border-[#4B57DB] bg-white rounded-sm" />
                <div className="absolute -top-1 -right-1 w-2 h-2 border border-[#4B57DB] bg-white rounded-sm" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 border border-[#4B57DB] bg-white rounded-sm" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 border border-[#4B57DB] bg-white rounded-sm" />
              </div>
            </div>

            <div className="w-[220px] bg-[#141414] flex flex-col shrink-0 font-sans text-[10px]">
              <div className="flex px-2 border-b border-white/5">
                <div className="px-3 py-2 text-[#FAFAFA] font-medium border-b border-white">Design</div>
                <div className="px-3 py-2 text-[#A0A0A0]">CSS</div>
                <div className="px-3 py-2 text-[#A0A0A0]">Export</div>
              </div>
              <div className="p-3 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#A0A0A0] uppercase tracking-widest text-[8px] font-mono">Typography</span>
                  <div className="flex-1 h-[1px] bg-white/5" />
                </div>
                <div className="flex justify-between items-center"><span className="text-[#A0A0A0]">Font</span><span className="text-[#FAFAFA]">Geist Sans</span></div>
                <div className="flex justify-between items-center"><span className="text-[#A0A0A0]">Weight</span><span className="text-[#FAFAFA]">500</span></div>
                <div className="flex justify-between items-center"><span className="text-[#A0A0A0]">Size</span><span className="font-mono text-[#FAFAFA]">32px</span></div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[#A0A0A0] uppercase tracking-widest text-[8px] font-mono">Fill</span>
                  <div className="flex-1 h-[1px] bg-white/5" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#A0A0A0]">Color</span>
                  <div className="flex items-center gap-1.5 border border-white/10 px-1.5 py-0.5 rounded-[2px] bg-[#0C0C14]">
                    <div className="w-2 h-2 bg-white rounded-[1px]" />
                    <span className="font-mono text-[9px] text-[#FAFAFA]">#FFFFFF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ==========================================
// 6. EXPORT / ZERO LOCK-IN
// ==========================================
function ExportSection() {
  return (
    <section id="export" className="py-32 bg-[#0C0C14] relative z-10 border-t border-white/10">
      <div className="max-w-[1000px] mx-auto px-6 text-center">
        <h2 className="font-serif text-4xl tracking-tight mb-4 text-white">Your code. Truly yours.</h2>
        <p className="text-[#A0A0A0] text-[15px] max-w-[500px] mx-auto mb-16">No proprietary iframes, no forced platform hosting. Export clean, human-readable React/Tailwind code with zero vendor lock-in.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div whileHover={{ y: -5 }} className="bg-[#141414] border border-white/10 rounded-[6px] p-6 text-left shadow-sm">
             <div className="w-8 h-8 rounded-[4px] bg-[#4B57DB]/10 text-[#4B57DB] flex items-center justify-center mb-6"><Code2 className="w-4 h-4" /></div>
             <h4 className="font-medium text-white mb-2">React Components</h4>
             <p className="text-[13px] text-[#A0A0A0]">Copy full React components cleanly mapped with inline Tailwind CSS utility classes.</p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="bg-[#141414] border border-white/10 rounded-[6px] p-6 text-left shadow-sm">
             <div className="w-8 h-8 rounded-[4px] bg-[#4B57DB]/10 text-[#4B57DB] flex items-center justify-center mb-6"><Monitor className="w-4 h-4" /></div>
             <h4 className="font-medium text-white mb-2">Next.js Package</h4>
             <p className="text-[13px] text-[#A0A0A0]">Download a fully configured Next.js project zip containing the entire route structure.</p>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="bg-[#141414] border border-white/10 rounded-[6px] p-6 text-left shadow-sm">
             <div className="w-8 h-8 rounded-[4px] bg-[#FF7A59]/10 text-[#FF7A59] flex items-center justify-center mb-6"><Layers className="w-4 h-4" /></div>
             <h4 className="font-medium text-white mb-2">Vanilla HTML/CSS</h4>
             <p className="text-[13px] text-[#A0A0A0]">Need it simple? Grab semantic HTML5 wrapped in a standalone CSS stylesheet.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// 7. FOOTER
// ==========================================
function Footer() {
  return (
    <footer className="py-8 bg-[#FAFAF8] border-t border-[#1A1A1A]/5 text-center text-[#6B6B6B] text-[13px] relative z-10">
      <p>© {new Date().getFullYear()} Studio OS. The Integrated Workspace.</p>
    </footer>
  );
}
