"use client";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] h-[52px] flex items-center justify-between px-10 bg-white/[0.92] backdrop-blur-[16px] backdrop-saturate-[180%] border-b border-[#EFEFEC]/50">
      <a
        className="flex items-center gap-2.5 no-underline text-[#1A1A1A]"
        href="/claude-version"
        aria-label="Studio OS home"
      >
        <svg
          width="24"
          height="16"
          viewBox="0 0 127 83"
          fill="none"
          aria-hidden="true"
        >
          <g transform="translate(4.075 2)">
            <rect x="0" y="66" width="119.189" height="13" rx="2" fill="rgba(75,87,219,0.67)" />
            <rect x="0" y="49" width="119.189" height="13" rx="2" fill="rgba(75,87,219,0.67)" />
            <rect x="0" y="32" width="119.189" height="13" rx="2" fill="rgba(75,87,219,0.67)" />
            <rect x="0" y="15" width="119.189" height="13" rx="2" fill="rgba(75,87,219,0.67)" />
            <rect x="0" y="0" width="57" height="11" rx="2" fill="rgba(75,87,219,0.67)" />
          </g>
          <g transform="translate(7.811 0)">
            <rect x="0" y="65" width="119.189" height="13" rx="2" fill="rgba(36,48,173,0.3)" />
            <rect x="0" y="48" width="119.189" height="13" rx="2" fill="rgba(36,48,173,0.3)" />
            <rect x="0" y="31" width="119.189" height="13" rx="2" fill="rgba(36,48,173,0.3)" />
            <rect x="0" y="14" width="119.189" height="13" rx="2" fill="rgba(36,48,173,0.3)" />
            <rect x="0" y="0" width="57" height="11" rx="2" fill="rgba(36,48,173,0.3)" />
          </g>
          <g transform="translate(0 4)">
            <rect x="0" y="66" width="119.189" height="13" rx="2" fill="rgb(75,87,219)" />
            <rect x="0" y="49" width="119.189" height="13" rx="2" fill="rgb(75,87,219)" />
            <rect x="0" y="32" width="119.189" height="13" rx="2" fill="rgb(75,87,219)" />
            <rect x="0" y="15" width="119.189" height="13" rx="2" fill="rgb(75,87,219)" />
            <rect x="0" y="0" width="57" height="11" rx="2" fill="rgb(75,87,219)" />
          </g>
        </svg>
        <span className="text-[13px] font-medium tracking-[-0.01em]">
          Studio OS
        </span>
      </a>
      <div className="flex items-center gap-7">
        <a
          className="text-[13px] text-[#6B6B6B] no-underline transition-colors duration-150 hover:text-[#1A1A1A]"
          href="#how"
        >
          How it works
        </a>
        <a
          className="text-[13px] text-[#6B6B6B] no-underline transition-colors duration-150 hover:text-[#1A1A1A]"
          href="#editor"
        >
          Editor
        </a>
        <a
          className="text-[13px] text-[#6B6B6B] no-underline transition-colors duration-150 hover:text-[#1A1A1A]"
          href="#output"
        >
          Output
        </a>
        <button className="text-[12px] font-medium text-white bg-[#1A1A1A] px-4 py-[7px] rounded-[4px] border-none cursor-pointer no-underline transition-all duration-150 hover:bg-[#333] hover:scale-[1.02] active:scale-[0.97]">
          Start designing
        </button>
      </div>
    </nav>
  );
}
