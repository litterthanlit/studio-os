"use client";

export function MarketingHowItWorks() {
  return (
    <section className="mkt-how" id="how">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="mkt-how-header" data-reveal>
          <div className="mkt-section-rule">
            <span>How it works</span>
          </div>
          <h2>
            Three steps to
            <br />
            <span>your design.</span>
          </h2>
        </div>

        <div className="mkt-how-grid">
          {/* Step 1: References */}
          <div className="mkt-how-step" data-reveal>
            <div className="mkt-how-num">01</div>
            <h3>Add references</h3>
            <p>
              Drag screenshots, paste URLs, or import from Pinterest. Studio OS
              scores and analyzes every image.
            </p>
            <div className="mkt-how-vis">
              <div className="mkt-how-vis-chrome">
                <div />
                <div />
                <div />
              </div>
              <div className="mkt-how-vis-body">
                <div className="mkt-ref-item">
                  <div
                    className="mkt-ref-thumb"
                    style={{
                      background:
                        "linear-gradient(135deg, #0C0F1D, #1B2654)",
                    }}
                  />
                  <span className="mkt-ref-name">Editorial homepage</span>
                  <span className="mkt-ref-score">97</span>
                </div>
                <div className="mkt-ref-item">
                  <div
                    className="mkt-ref-thumb"
                    style={{
                      background:
                        "linear-gradient(135deg, #F5E6D3, #C4A882)",
                    }}
                  />
                  <span className="mkt-ref-name">Minimal portfolio</span>
                  <span className="mkt-ref-score">94</span>
                </div>
                <div className="mkt-ref-item">
                  <div
                    className="mkt-ref-thumb"
                    style={{
                      background: "linear-gradient(135deg, #111, #333)",
                    }}
                  />
                  <span className="mkt-ref-name">Swiss typography</span>
                  <span className="mkt-ref-score">91</span>
                </div>
                <div
                  className="mkt-ref-item"
                  style={{ borderStyle: "dashed", opacity: 0.5 }}
                >
                  <div
                    className="mkt-ref-thumb"
                    style={{ background: "#F5F5F0" }}
                  />
                  <span className="mkt-ref-name" style={{ color: "#A0A0A0" }}>
                    Drop more...
                  </span>
                  <span />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Generate */}
          <div className="mkt-how-step" data-reveal>
            <div className="mkt-how-num">02</div>
            <h3>Generate</h3>
            <p>
              Studio OS extracts your taste — spacing, typography, color,
              density — and generates a design that reflects it.
            </p>
            <div className="mkt-how-vis">
              <div className="mkt-how-vis-chrome">
                <div />
                <div />
                <div />
              </div>
              <div className="mkt-how-vis-body">
                <div className="mkt-gen-stage done">
                  <div className="mkt-gen-dot" />
                  <span className="mkt-gen-text">Analyzing references</span>
                  <span className="mkt-gen-status">Done</span>
                </div>
                <div className="mkt-gen-stage done">
                  <div className="mkt-gen-dot" />
                  <span className="mkt-gen-text">
                    Extracting taste profile
                  </span>
                  <span className="mkt-gen-status">Done</span>
                </div>
                <div className="mkt-gen-stage active">
                  <div className="mkt-gen-dot" />
                  <span className="mkt-gen-text">Composing layout</span>
                  <span className="mkt-gen-status">Working</span>
                </div>
                <div className="mkt-gen-stage pending">
                  <div className="mkt-gen-dot" />
                  <span className="mkt-gen-text">Rendering design</span>
                  <span className="mkt-gen-status">Pending</span>
                </div>
                <div className="mkt-gen-stage pending">
                  <div className="mkt-gen-dot" />
                  <span className="mkt-gen-text">Validating fidelity</span>
                  <span className="mkt-gen-status">Pending</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Edit */}
          <div className="mkt-how-step" data-reveal>
            <div className="mkt-how-num">03</div>
            <h3>Edit like a designer</h3>
            <p>
              Select, resize, restyle. Real canvas feel with layout semantics,
              measurement guides, and a precision inspector.
            </p>
            <div className="mkt-how-vis">
              <div className="mkt-how-vis-chrome">
                <div />
                <div />
                <div />
              </div>
              <div className="mkt-how-vis-body">
                <div className="mkt-ed-hint">
                  <div className="mkt-ed-panel mkt-ed-layers">
                    <div className="mkt-ed-layer">Page</div>
                    <div className="mkt-ed-layer sel">Hero</div>
                    <div className="mkt-ed-layer">Features</div>
                    <div className="mkt-ed-layer">Quote</div>
                    <div className="mkt-ed-layer">Footer</div>
                  </div>
                  <div className="mkt-ed-canvas">
                    <div className="mkt-ed-art">
                      <div className="mkt-ed-art-top" />
                      <div className="mkt-ed-art-body">
                        <div className="mkt-ed-art-bar" />
                        <div className="mkt-ed-art-bar" style={{ width: "60%" }} />
                        <div className="mkt-ed-art-bar" style={{ width: "40%" }} />
                      </div>
                      <div className="mkt-ed-art-sel" />
                    </div>
                  </div>
                  <div className="mkt-ed-panel mkt-ed-insp">
                    <div className="mkt-ed-insp-row" />
                    <div className="mkt-ed-insp-row" style={{ width: "80%" }} />
                    <div className="mkt-ed-insp-row" />
                    <div style={{ height: 4 }} />
                    <div className="mkt-ed-insp-row" />
                    <div className="mkt-ed-insp-row" style={{ width: "80%" }} />
                    <div className="mkt-ed-insp-row" style={{ width: "60%" }} />
                    <div style={{ height: 4 }} />
                    <div className="mkt-ed-insp-row" />
                    <div className="mkt-ed-insp-row" style={{ width: "80%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
