import { LogoMark } from "./logo-mark";

export function Footer() {
  return (
    <footer className="w-full bg-white relative pb-10">
      <div className="absolute top-0 left-[-50px] right-[-50px] h-[1px] bg-[#0C0C14]/8" />
      <div className="w-full grid grid-cols-1 md:grid-cols-3 pt-6 px-5 md:px-[60px] pb-10 relative">
        <div className="hidden md:block absolute top-0 bottom-0 left-[33.33%] w-[1px] bg-[#0C0C14]/8" />
        <div className="hidden md:block absolute top-0 bottom-0 left-[66.66%] w-[1px] bg-[#0C0C14]/8" />
        <div className="absolute top-[-4px] left-[-4px] font-mono text-[8px] text-[#0C0C14]/20">+</div>
        {/* Col 1 */}
        <div className="flex items-center gap-3 p-4 md:p-8">
          <LogoMark />
          <span className="font-sans font-medium text-[16px] text-[#0C0C14]">studio OS</span>
        </div>
        {/* Col 2 */}
        <div className="flex flex-col gap-2 p-4 md:p-8 font-sans text-[13px] text-[#6B6B6B]">
          <div className="font-mono text-[9px] uppercase tracking-[1px] text-[#A0A0A0] mb-2">Links</div>
          <a href="#features" className="hover:text-[#4B57DB] transition-colors">Features</a>
          <a href="#output" className="hover:text-[#4B57DB] transition-colors">Gallery</a>
          <a href="#export" className="hover:text-[#4B57DB] transition-colors">Export</a>
          <a href="/privacy" className="hover:text-[#4B57DB] transition-colors">Privacy</a>
        </div>
        {/* Col 3 */}
        <div className="flex flex-col justify-between p-4 md:p-8">
          <div className="font-mono text-[10px] text-[#A0A0A0] leading-relaxed">
            © 2026 Studio OS.<br />All rights reserved.
          </div>
          <div className="font-['Noto_Serif'] text-[22px] text-[#0C0C14] mt-8 text-right">
            Your taste. <em style={{ fontStyle: 'italic', color: '#4B57DB' }}>Amplified.</em>
          </div>
        </div>
      </div>
      <div className="w-full h-[1px] bg-[#0C0C14]/8 relative mt-4">
        <div className="absolute top-[-4px] right-[60px] font-mono text-[8px] text-[#0C0C14]/20">+</div>
      </div>
    </footer>
  );
}
