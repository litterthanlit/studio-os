import { LogoMark } from "./logo-mark";

export function Nav() {
  return (
    <nav className="w-full h-[72px] px-5 md:px-[60px] flex items-center justify-between z-50 bg-white/90 backdrop-blur-sm border-b border-[#0C0C14]/5 sticky top-0">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="studio-os-wordmark text-[17px] text-[#0C0C14]">studio OS</span>
      </div>
      <div className="flex items-center gap-7 font-sans text-[13px] font-medium text-[#6B6B6B]">
        <a href="#comparison" className="hover:text-[#0C0C14] transition-colors hidden md:block">The difference</a>
        <a href="#how" className="hover:text-[#0C0C14] transition-colors hidden md:block">How it works</a>
        <a href="#output" className="hover:text-[#0C0C14] transition-colors hidden md:block">Output gallery</a>
        <button className="bg-[#4B57DB] text-white text-[13px] px-5 py-2 rounded-[4px] hover:bg-[#3D49C7] transition-colors">
          Get access
        </button>
      </div>
    </nav>
  );
}
