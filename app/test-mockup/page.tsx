import * as React from "react";
import { 
  HomeIcon, 
  ProjectsIcon, 
  CanvasIcon, 
  ImageIcon,
  SettingsIcon
} from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

function UserAvatar({ size = 32 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-[#EDF2FB] text-[#2430AD] font-medium select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.375,
        letterSpacing: "0.02em",
      }}
    >
      NG
    </div>
  );
}

// ─── Dummy Icons ────────────────────────────────────────────────────────────
function StudioOSLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="24" height="18" rx="3" fill="#2430AD" opacity="0.25" />
      <path d="M4 11C4 9.34315 5.34315 8 7 8H13L15.5 5.5H25C26.6569 5.5 28 6.84315 28 8.5V23C28 24.6569 26.6569 26 25 26H7C5.34315 26 4 24.6569 4 23V11Z" fill="#2430AD" opacity="0.55" />
      <rect x="4" y="12" width="24" height="14" rx="3" fill="#2430AD" />
      <line x1="10" y1="18" x2="22" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <line x1="10" y1="22" x2="22" y2="22" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function TestMockupPage() {
  return (
    <div className="flex h-screen w-full bg-[#FAFBFE] font-sans text-[#0F172A] overflow-hidden">
      
      {/* ── Left Sidebar (220px, white border-r) ── */}
      <aside className="w-[220px] h-full shrink-0 flex flex-col bg-white border-r border-[#E2E8F0] px-3 py-5">
        
        {/* Header Logo */}
        <div className="mb-5 flex h-10 items-center gap-2.5 px-2.5">
          <div className="flex items-center gap-2">
            <StudioOSLogo />
            <span
              className="text-[15px] font-semibold leading-none tracking-[-0.01em]"
              style={{
                fontFamily: "var(--font-geist-sans)",
                background: "linear-gradient(180deg, #2430AD 0%, #5C69F7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Studio OS
            </span>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="flex flex-col gap-0.5">
          {[
            { label: "Home", active: false, icon: HomeIcon },
            { label: "Projects", active: false, icon: ProjectsIcon },
            { label: "Canvas", active: true, icon: CanvasIcon },
            { label: "Explore", active: false, icon: ImageIcon },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex h-9 items-center gap-3 rounded-md px-2.5 border-l-[2px] transition-all duration-150 ease-out cursor-pointer ${
                item.active 
                ? "bg-[#D1E4FC] text-[#2430AD] border-[#2430AD]" 
                : "text-[#94A3B8] border-transparent hover:bg-[#F4F8FF] hover:text-[#64748B]"
              }`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" bare />
              <span className={`text-[13px] leading-none ${item.active ? "font-medium" : "font-normal"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </nav>

        {/* Projects Nav */}
        <div className="mt-6 px-2.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#94A3B8] select-none">
            Projects
          </span>
        </div>
        <div className="mt-2 flex flex-col gap-0.5">
          {[
            { label: "Acme Rebrand", color: "#F97316" },
            { label: "FinTech Dashboard", color: "#1D4ED8" },
            { label: "Editorial Magazine", color: "#8B5CF6" },
          ].map((proj) => (
            <div
              key={proj.label}
              className="flex h-8 items-center gap-2.5 rounded-md px-2.5 border-l-[2px] border-transparent text-[#64748B] hover:bg-[#F4F8FF] hover:text-[#0F172A] cursor-pointer"
            >
              <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: proj.color }} />
              <span className="text-[13px] font-normal">{proj.label}</span>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* Bottom Profile */}
        <div className="border-t border-[#E2E8F0] pt-3 mt-3 px-2.5 flex items-center gap-2.5">
          <UserAvatar size={32} />
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-medium text-[#0F172A] leading-tight truncate">Nick G</span>
            <span className="text-[11px] text-[#94A3B8] leading-tight">Studio OS</span>
          </div>
          <div className="ml-auto w-8 h-8 flex items-center justify-center rounded-md text-[#94A3B8] hover:bg-[#F4F8FF] hover:text-[#64748B] cursor-pointer">
            <SettingsIcon className="h-4 w-4" bare />
          </div>
        </div>
      </aside>

      {/* ── Main Canvas Content Area ── */}
      <main className="flex-1 flex flex-col h-full bg-[#FAFBFE] overflow-y-auto">
        
        {/* Top Header */}
        <header className="px-10 pt-10 pb-6 shrink-0 z-10 sticky top-0 bg-[#FAFBFE] border-b border-[#E2E8F0]/30 backdrop-blur-sm">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <h1 className="text-[24px] leading-[32px] tracking-[-0.015em] font-semibold text-[#0F172A]">
              Canvas
            </h1>
            <div className="flex items-center gap-3">
              <Button variant="secondary">Analyze</Button>
              <Button variant="primary">Generate</Button>
            </div>
          </div>
        </header>

        {/* Main Scrolling Body */}
        <div className="flex-1 max-w-[1200px] mx-auto w-full px-10 py-8 space-y-12">
          
          {/* Completed Horizontal Stepper */}
          <section className="flex items-center gap-4">
            {[ 
              { label: "References", done: true },
              { label: "Analysis", done: true },
              { label: "Design System", done: true },
              { label: "Variants", done: true, active: true }
            ].map((step, idx, arr) => (
              <React.Fragment key={step.label}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${step.done && !step.active ? "bg-[#D1E4FC] text-[#2430AD]" : "bg-[#2430AD] text-white"}`}>
                    {step.done && !step.active ? (
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[11px] font-semibold font-sans">{idx + 1}</span>
                    )}
                  </div>
                  <span className={`text-[13px] font-medium ${step.active ? "text-[#0F172A]" : "text-[#64748B]"}`}>
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="h-px w-10 bg-[#E2E8F0]" />
                )}
              </React.Fragment>
            ))}
          </section>

          {/* Variants Gallery */}
          <section className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-[20px] leading-[28px] tracking-[-0.01em] font-semibold text-[#0F172A]">Generated Variants</h2>
                <p className="text-[14px] leading-[22px] font-normal text-[#64748B] mt-1">Review and select your preferred direction to proceed to the editor.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Variant A (Not Selected) */}
              <div className="flex flex-col rounded-xl bg-white border border-[#E2E8F0] overflow-hidden hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:border-[#CBD5E1] transition-all duration-150 cursor-pointer">
                <div className="aspect-[16/10] bg-[#FAFBFE] border-b border-[#E2E8F0] relative group">
                  <img src="https://picsum.photos/seed/vara/800/500" alt="Variant A" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#0F172A]/0 group-hover:bg-[#0F172A]/5 transition-colors duration-150" />
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-[#0F172A]">Variant A</span>
                    <span className="text-[12px] text-[#64748B] uppercase tracking-[0.08em] mt-0.5">Minimal Base</span>
                  </div>
                  <Button variant="ghost" className="h-8 px-3">Select</Button>
                </div>
              </div>

              {/* Variant B (Selected) */}
              <div className="flex flex-col rounded-xl bg-white border-2 border-[#2430AD] shadow-[inset_0_0_12px_#FAFBFE,0_4px_12px_rgba(36,48,173,0.08)] overflow-hidden transition-all duration-150 cursor-pointer scale-[1.01]">
                <div className="aspect-[16/10] bg-[#FAFBFE] border-b border-[#E2E8F0] relative">
                  <img src="https://picsum.photos/seed/varb/800/500" alt="Variant B" className="w-full h-full object-cover" />
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-[#0F172A]">Variant B</span>
                    <span className="text-[12px] text-[#2430AD] uppercase tracking-[0.08em] mt-0.5 font-medium">Selected Direction</span>
                  </div>
                  <Button variant="primary" className="h-8 px-3">Active</Button>
                </div>
              </div>

              {/* Variant C (Not Selected) */}
              <div className="flex flex-col rounded-xl bg-white border border-[#E2E8F0] overflow-hidden hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:border-[#CBD5E1] transition-all duration-150 cursor-pointer">
                <div className="aspect-[16/10] bg-[#FAFBFE] border-b border-[#E2E8F0] relative group">
                  <img src="https://picsum.photos/seed/varc/800/500" alt="Variant C" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#0F172A]/0 group-hover:bg-[#0F172A]/5 transition-colors duration-150" />
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-[#0F172A]">Variant C</span>
                    <span className="text-[12px] text-[#64748B] uppercase tracking-[0.08em] mt-0.5">High Contrast</span>
                  </div>
                  <Button variant="ghost" className="h-8 px-3">Select</Button>
                </div>
              </div>

            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
