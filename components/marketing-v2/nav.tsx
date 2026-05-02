import Link from "next/link";
import { LogoMark } from "./logo-mark";

export function Nav() {
  return (
    <header className="absolute top-0 left-0 right-0 w-full z-50 px-5 md:px-[80px] h-20 flex items-center justify-center pointer-events-none">
      <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="studio-os-wordmark text-[15px] text-white">studio OS</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-white/60 hover:text-white transition-colors text-sm font-sans tracking-wide">
            Features
          </Link>
          <Link href="#workflow" className="text-white/60 hover:text-white transition-colors text-sm font-sans tracking-wide">
            Workflow
          </Link>
          <Link href="#export" className="text-white/60 hover:text-white transition-colors text-sm font-sans tracking-wide">
            Export
          </Link>
          <button className="bg-[#4B57DB] text-white text-sm font-medium px-4 py-2 rounded-[4px] hover:bg-[#4B57DB]/90 transition-colors">
            Join waitlist
          </button>
        </nav>
      </div>
    </header>
  );
}
