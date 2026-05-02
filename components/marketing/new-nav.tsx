"use client";

export function MarketingNav() {
  return (
    <nav className="mkt-nav">
      <a className="mkt-nav-logo" href="#" aria-label="Studio OS home">
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
        <span className="mkt-nav-logo-text studio-os-wordmark">studio OS</span>
      </a>
      <div className="flex items-center gap-7">
        <a className="mkt-nav-link" href="#how">
          How it works
        </a>
        <a className="mkt-nav-link" href="#editor">
          Editor
        </a>
        <a className="mkt-nav-link" href="#output">
          Output
        </a>
        <button
          className="mkt-nav-cta"
          aria-label="Start designing with Studio OS"
        >
          Start designing
        </button>
      </div>
    </nav>
  );
}
