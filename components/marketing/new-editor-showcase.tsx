"use client";

export function MarketingEditorShowcase() {
  return (
    <section className="mkt-showcase" id="editor">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="mkt-showcase-header" data-reveal>
          <div className="mkt-section-rule">
            <span>The editor</span>
          </div>
          <h2>
            A real design tool.
            <br />
            <span>Not a preview pane.</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Card 1: Canvas feel */}
          <div className="mkt-sc-card" data-reveal>
            <div className="mkt-sc-card-vis">
              <div className="mkt-sc-canvas-demo">
                <div className="mkt-sc-frame">
                  <div className="mkt-sc-frame-label">Hero — frame</div>
                </div>
                <div className="mkt-sc-hov" />
                <div className="mkt-sc-measure" />
                <div className="mkt-sc-measure-pill">24px</div>
              </div>
            </div>
            <div className="mkt-sc-card-body">
              <h3>Canvas feel</h3>
              <p>
                Hover outlines, frame labels, measurement guides, smooth zoom.
                It feels like the tools you already use.
              </p>
            </div>
          </div>

          {/* Card 2: Inspector */}
          <div className="mkt-sc-card" data-reveal>
            <div className="mkt-sc-card-vis">
              <div className="mkt-sc-insp-demo">
                <div className="mkt-sc-insp-section">
                  <div className="mkt-sc-insp-rule">
                    <span>Size</span>
                  </div>
                  <div className="mkt-sc-insp-row">
                    <span className="mkt-sc-insp-lbl">Width</span>
                    <span className="mkt-sc-insp-val">Fill</span>
                  </div>
                  <div className="mkt-sc-insp-row">
                    <span className="mkt-sc-insp-lbl">Height</span>
                    <span className="mkt-sc-insp-val">Hug</span>
                  </div>
                  <div className="mkt-sc-seg">
                    <div className="mkt-sc-seg-o">Fixed</div>
                    <div className="mkt-sc-seg-o on">Fill</div>
                    <div className="mkt-sc-seg-o">Hug</div>
                  </div>
                </div>
                <div className="mkt-sc-insp-section">
                  <div className="mkt-sc-insp-rule">
                    <span>Typography</span>
                  </div>
                  <div className="mkt-sc-insp-row">
                    <span className="mkt-sc-insp-lbl">Font</span>
                    <span className="mkt-sc-insp-val">Geist Sans</span>
                  </div>
                  <div className="mkt-sc-insp-row">
                    <span className="mkt-sc-insp-lbl">Weight</span>
                    <span className="mkt-sc-insp-val">500</span>
                  </div>
                  <div className="mkt-sc-insp-row">
                    <span className="mkt-sc-insp-lbl">Size</span>
                    <span className="mkt-sc-insp-val">28px</span>
                  </div>
                  <div className="mkt-sc-insp-row">
                    <span className="mkt-sc-insp-lbl">Tracking</span>
                    <span className="mkt-sc-insp-val">-0.03em</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mkt-sc-card-body">
              <h3>Precision inspector</h3>
              <p>
                Fixed / Fill / Hug sizing, typography, spacing, and fill — all
                in a two-column key-value layout the AI understands.
              </p>
            </div>
          </div>

          {/* Card 3: Layers */}
          <div className="mkt-sc-card" data-reveal>
            <div className="mkt-sc-card-vis">
              <div className="mkt-sc-layers-demo">
                <div className="mkt-sc-layers-h">Layers</div>
                <div className="mkt-sc-ly">
                  <div className="mkt-sc-ly-ic" /> Page
                </div>
                <div className="mkt-sc-ly" style={{ paddingLeft: 14 }}>
                  <div className="mkt-sc-ly-ic" /> Hero Section
                </div>
                <div className="mkt-sc-ly sel" style={{ paddingLeft: 28 }}>
                  <div className="mkt-sc-ly-ic" /> Heading
                </div>
                <div className="mkt-sc-ly" style={{ paddingLeft: 28 }}>
                  <div className="mkt-sc-ly-ic" /> Subtitle
                </div>
                <div className="mkt-sc-ly" style={{ paddingLeft: 28 }}>
                  <div className="mkt-sc-ly-ic" /> Cover Image
                </div>
                <div className="mkt-sc-ly" style={{ paddingLeft: 14 }}>
                  <div className="mkt-sc-ly-ic" /> Features Grid
                </div>
                <div className="mkt-sc-ly" style={{ paddingLeft: 28 }}>
                  <div className="mkt-sc-ly-ic" /> Card 1
                </div>
                <div className="mkt-sc-ly" style={{ paddingLeft: 28 }}>
                  <div className="mkt-sc-ly-ic" /> Card 2
                </div>
              </div>
            </div>
            <div className="mkt-sc-card-body">
              <h3>Component hierarchy</h3>
              <p>
                Clean tree structure, drag reorder, multi-select. See exactly
                what was generated and restructure it.
              </p>
            </div>
          </div>

          {/* Card 4: Layout semantics */}
          <div className="mkt-sc-card" data-reveal>
            <div className="mkt-sc-card-vis light">
              <div className="mkt-sc-sizing-demo">
                <div className="mkt-sc-sizing-row">
                  <div className="text-center">
                    <div className="mkt-sc-sizing-box fill">Fill</div>
                    <div className="mkt-sc-sizing-label">Stretches</div>
                  </div>
                  <div className="text-center">
                    <div className="mkt-sc-sizing-box hug">Hug</div>
                    <div className="mkt-sc-sizing-label">Wraps</div>
                  </div>
                  <div className="text-center">
                    <div className="mkt-sc-sizing-box fixed">Fixed</div>
                    <div className="mkt-sc-sizing-label">Exact</div>
                  </div>
                </div>
                <div className="mkt-sc-sizing-caption">
                  Layout semantics the AI understands
                </div>
              </div>
            </div>
            <div className="mkt-sc-card-body">
              <h3>Layout semantics</h3>
              <p>
                Fill, Hug, and Fixed sizing — not just pixels. The AI generates
                with these constraints, and you edit with them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
