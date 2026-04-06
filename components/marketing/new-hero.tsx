"use client";

export function MarketingHero() {
  return (
    <section className="mkt-hero" id="hero">
      <div
        className="relative z-[2] flex flex-col items-center"
      >
        <div className="mkt-hero-badge" data-reveal="hero">
          <div className="mkt-hero-badge-dot" />
          Now in early access
        </div>

        <h1 data-reveal="hero">
          AI that designs<br />
          like <span style={{ color: "#4B57DB" }}>you</span>.
        </h1>

        <p className="mkt-hero-sub" data-reveal="hero">
          Feed Studio OS your references. It extracts your design sensibility
          and generates pages that look like yours — not like everyone
          else&apos;s.
        </p>

        <div className="flex gap-3 items-center" data-reveal="hero">
          <button className="mkt-btn-primary">Start designing</button>
          <a className="mkt-btn-secondary" href="#how">
            See how it works
          </a>
        </div>
      </div>

      {/* Product shot */}
      <div className="mkt-hero-product-wrap" data-reveal>
        <div className="mkt-hero-product">
          {/* Browser chrome */}
          <div className="mkt-p-chrome">
            <div className="mkt-p-dot" style={{ background: "#FF5F56" }} />
            <div className="mkt-p-dot" style={{ background: "#FEBC2E" }} />
            <div className="mkt-p-dot" style={{ background: "#27C840" }} />
            <div className="mkt-p-url">
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "#4B57DB",
                }}
              />
              studio-os.app
            </div>
          </div>

          {/* Editor body */}
          <div className="mkt-p-body">
            {/* Mini rail */}
            <div className="mkt-p-rail">
              <div className="mkt-p-rail-logo">S</div>
              <div className="mkt-p-rail-ic on" />
              <div className="mkt-p-rail-ic" />
              <div className="mkt-p-rail-ic" />
              <div className="flex-1" />
              <div className="mkt-p-rail-ic" />
            </div>

            {/* Layers panel */}
            <div className="mkt-p-layers">
              <div className="mkt-p-layers-h">Layers</div>
              <div className="mkt-p-ly">
                <div className="mkt-p-ly-ic" /> Page
              </div>
              <div className="mkt-p-ly" style={{ paddingLeft: 26 }}>
                <div className="mkt-p-ly-ic" /> Hero Section
              </div>
              <div className="mkt-p-ly sel" style={{ paddingLeft: 38 }}>
                <div className="mkt-p-ly-ic" /> Heading
              </div>
              <div className="mkt-p-ly" style={{ paddingLeft: 38 }}>
                <div className="mkt-p-ly-ic" /> Subtitle
              </div>
              <div className="mkt-p-ly" style={{ paddingLeft: 38 }}>
                <div className="mkt-p-ly-ic" /> Cover Image
              </div>
              <div className="mkt-p-ly" style={{ paddingLeft: 26 }}>
                <div className="mkt-p-ly-ic" /> Features Grid
              </div>
              <div className="mkt-p-ly" style={{ paddingLeft: 38 }}>
                <div className="mkt-p-ly-ic" /> Card 1
              </div>
              <div className="mkt-p-ly" style={{ paddingLeft: 38 }}>
                <div className="mkt-p-ly-ic" /> Card 2
              </div>
              <div className="mkt-p-ly" style={{ paddingLeft: 38 }}>
                <div className="mkt-p-ly-ic" /> Card 3
              </div>
              <div className="mkt-p-ly" style={{ paddingLeft: 26 }}>
                <div className="mkt-p-ly-ic" /> Quote Block
              </div>
            </div>

            {/* Canvas */}
            <div className="mkt-p-canvas">
              <div className="mkt-p-art">
                <div className="mkt-p-art-label">Desktop — 1440</div>
                {/* Selection outline */}
                <div
                  className="mkt-p-sel"
                  style={{ top: 32, left: 22, width: 200, height: 30 }}
                >
                  <div className="mkt-p-sel-tag">Heading — text</div>
                </div>
                {/* Hover outline */}
                <div
                  className="mkt-p-hov"
                  style={{ top: 172, left: 22, right: 22, height: 115 }}
                />

                {/* Editorial content */}
                <div className="mkt-art-h">
                  <div className="mkt-art-h-kicker">Case Study</div>
                  <div className="mkt-art-h-title">
                    Design at the
                    <br />
                    speed of thought
                  </div>
                  <div className="mkt-art-h-sub">
                    A new approach to creative tools
                  </div>
                  <div className="mkt-art-h-img" />
                </div>
                <div className="mkt-art-b">
                  <div
                    className="grid gap-2 mb-3.5"
                    style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
                  >
                    <div className="mkt-art-card">
                      <div className="mkt-art-card-bar" />
                      <h4>Taste Engine</h4>
                      <p>Extract design patterns from any reference</p>
                    </div>
                    <div className="mkt-art-card">
                      <div className="mkt-art-card-bar" />
                      <h4>Real Editor</h4>
                      <p>Canvas feel with deep manipulation</p>
                    </div>
                    <div className="mkt-art-card">
                      <div className="mkt-art-card-bar" />
                      <h4>Clean Export</h4>
                      <p>Copy HTML with inline Tailwind</p>
                    </div>
                  </div>
                  <blockquote className="mkt-art-quote">
                    &ldquo;Every reference shapes the output. Your taste becomes
                    the constraint.&rdquo;
                  </blockquote>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="mkt-p-bar">
                <span>100%</span>
                <div className="mkt-p-bar-d" />
                <span>Desktop</span>
                <div className="mkt-p-bar-d" />
                <span>&#8617;</span>
                <span>&#8618;</span>
              </div>
            </div>

            {/* Inspector */}
            <div className="mkt-p-insp">
              <div className="mkt-p-insp-tabs">
                <div className="mkt-p-insp-tab on">Design</div>
                <div className="mkt-p-insp-tab">CSS</div>
                <div className="mkt-p-insp-tab">Export</div>
              </div>
              <div className="mkt-p-insp-body">
                <div className="mkt-p-rule">
                  <span>Size</span>
                </div>
                <div className="mkt-p-row">
                  <span className="mkt-p-lbl">Width</span>
                  <span className="mkt-p-val">Fill</span>
                </div>
                <div className="mkt-p-row">
                  <span className="mkt-p-lbl">Height</span>
                  <span className="mkt-p-val">Hug</span>
                </div>
                <div className="mkt-p-seg">
                  <div className="mkt-p-seg-o">Fixed</div>
                  <div className="mkt-p-seg-o on">Fill</div>
                  <div className="mkt-p-seg-o">Hug</div>
                </div>
                <div className="mkt-p-gap" />

                <div className="mkt-p-rule">
                  <span>Typography</span>
                </div>
                <div className="mkt-p-row">
                  <span className="mkt-p-lbl">Font</span>
                  <span className="mkt-p-val">Geist Sans</span>
                </div>
                <div className="mkt-p-row">
                  <span className="mkt-p-lbl">Weight</span>
                  <span className="mkt-p-val">500</span>
                </div>
                <div className="mkt-p-row">
                  <span className="mkt-p-lbl">Size</span>
                  <span className="mkt-p-val">
                    28<span className="mkt-p-unit">px</span>
                  </span>
                </div>
                <div className="mkt-p-row">
                  <span className="mkt-p-lbl">Leading</span>
                  <span className="mkt-p-val">1.1</span>
                </div>
                <div className="mkt-p-row">
                  <span className="mkt-p-lbl">Tracking</span>
                  <span className="mkt-p-val">
                    -0.03<span className="mkt-p-unit">em</span>
                  </span>
                </div>
                <div className="mkt-p-gap" />

                <div className="mkt-p-rule">
                  <span>Fill</span>
                </div>
                <div className="mkt-p-row">
                  <span className="mkt-p-lbl">Color</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        background: "white",
                        border: "1px solid #333",
                        borderRadius: 2,
                      }}
                    />
                    <span className="mkt-p-val">#FFFFFF</span>
                  </div>
                </div>
                <div className="mkt-p-gap" />

                <div className="mkt-p-rule">
                  <span>Appearance</span>
                </div>
                <div className="mkt-p-row">
                  <span className="mkt-p-lbl">Radius</span>
                  <span className="mkt-p-val">
                    0<span className="mkt-p-unit">px</span>
                  </span>
                </div>
                <div className="mkt-p-row">
                  <span className="mkt-p-lbl">Opacity</span>
                  <span className="mkt-p-val">
                    100<span className="mkt-p-unit">%</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
