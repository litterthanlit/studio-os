"use client";

export function MarketingGallery() {
  return (
    <section className="mkt-gallery" id="output">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="mkt-gallery-header" data-reveal>
          <div className="mkt-section-rule">
            <span>Output quality</span>
          </div>
          <h2>
            One tool.
            <br />
            Every taste.
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Editorial */}
          <div className="mkt-gal-card" data-reveal>
            <div className="mkt-gal-vis">
              <div className="mkt-gal-inner mkt-gal-1">
                <div className="mkt-gal-hero">
                  <div className="mkt-gal-k">Issue 01</div>
                  <div className="mkt-gal-h">
                    Design at the
                    <br />
                    speed of thought
                  </div>
                </div>
                <div className="mkt-gal-b">
                  <div className="mkt-gal-line" style={{ width: "70%" }} />
                  <div className="mkt-gal-line" style={{ width: "45%" }} />
                </div>
              </div>
            </div>
            <div className="mkt-gal-meta">
              <div className="mkt-gal-tag">Editorial</div>
              <p>From 3 dark editorial magazine references</p>
            </div>
          </div>

          {/* Warm Minimal */}
          <div className="mkt-gal-card" data-reveal>
            <div className="mkt-gal-vis">
              <div className="mkt-gal-inner mkt-gal-2">
                <div className="mkt-gal-hero">
                  <div className="mkt-gal-h">
                    Craft &amp;
                    <br />
                    Simplicity
                  </div>
                </div>
                <div className="mkt-gal-b">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="mkt-gal-2 mkt-gal-col" />
                    <div className="mkt-gal-2 mkt-gal-col" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mkt-gal-meta">
              <div className="mkt-gal-tag">Warm Minimal</div>
              <p>From a Scandinavian portfolio site</p>
            </div>
          </div>

          {/* Brutalist */}
          <div className="mkt-gal-card" data-reveal>
            <div className="mkt-gal-vis">
              <div className="mkt-gal-inner mkt-gal-3">
                <div className="mkt-gal-hero">
                  <div className="mkt-gal-h">
                    BREAK
                    <br />
                    RULES
                  </div>
                </div>
                <div className="mkt-gal-b">
                  <div className="mkt-gal-line" style={{ width: "70%" }} />
                </div>
              </div>
            </div>
            <div className="mkt-gal-meta">
              <div className="mkt-gal-tag">Brutalist</div>
              <p>From 3 brutalist web references</p>
            </div>
          </div>

          {/* Clean SaaS */}
          <div className="mkt-gal-card" data-reveal>
            <div className="mkt-gal-vis">
              <div className="mkt-gal-inner mkt-gal-4">
                <div className="mkt-gal-hero">
                  <div className="mkt-gal-h">
                    Ship faster.
                    <br />
                    Build better.
                  </div>
                  <div className="mkt-gal-btn">Get Started</div>
                </div>
                <div className="mkt-gal-b">
                  <div className="grid grid-cols-3 gap-[3px]">
                    <div className="mkt-gal-4 mkt-gal-g3-i" />
                    <div className="mkt-gal-4 mkt-gal-g3-i" />
                    <div className="mkt-gal-4 mkt-gal-g3-i" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mkt-gal-meta">
              <div className="mkt-gal-tag">Clean SaaS</div>
              <p>From a gradient SaaS landing page</p>
            </div>
          </div>

          {/* Dark Portfolio */}
          <div className="mkt-gal-card" data-reveal>
            <div className="mkt-gal-vis">
              <div className="mkt-gal-inner mkt-gal-5">
                <div className="mkt-gal-hero">
                  <div className="mkt-gal-h">
                    Selected works
                    <br />
                    2024–2026
                  </div>
                </div>
                <div className="mkt-gal-b">
                  <div className="flex gap-[3px]">
                    <div className="mkt-gal-th" />
                    <div className="mkt-gal-th" />
                    <div className="mkt-gal-th" />
                    <div className="mkt-gal-th" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mkt-gal-meta">
              <div className="mkt-gal-tag">Dark Portfolio</div>
              <p>From a photographer&apos;s folio site</p>
            </div>
          </div>

          {/* Swiss */}
          <div className="mkt-gal-card" data-reveal>
            <div className="mkt-gal-vis">
              <div className="mkt-gal-inner mkt-gal-6">
                <div className="mkt-gal-hero">
                  <div className="mkt-gal-h">
                    Form
                    <br />
                    follows
                    <br />
                    function
                  </div>
                </div>
                <div className="mkt-gal-b">
                  <div className="mkt-gal-line" style={{ width: "70%" }} />
                  <div className="mkt-gal-line" style={{ width: "40%" }} />
                  <div className="mkt-gal-accent" />
                </div>
              </div>
            </div>
            <div className="mkt-gal-meta">
              <div className="mkt-gal-tag">Swiss</div>
              <p>From International Typographic Style refs</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
