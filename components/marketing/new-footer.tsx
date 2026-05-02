"use client";

export function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-left">
        <svg
          width="18"
          height="12"
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
        <span className="studio-os-wordmark">studio OS</span>
      </div>
      <div className="flex gap-5">
        <a className="mkt-footer-link" href="/privacy">
          Privacy
        </a>
        <a
          className="mkt-footer-link"
          href="https://twitter.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Twitter
        </a>
      </div>
    </footer>
  );
}
