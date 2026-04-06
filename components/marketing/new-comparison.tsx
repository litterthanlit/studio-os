"use client";

export function MarketingComparison() {
  return (
    <section className="mkt-comparison" id="comparison">
      <div className="max-w-[1120px] mx-auto px-10">
        <div className="mkt-comp-header text-center mb-[72px]" data-reveal>
          <div className="mkt-section-rule">
            <span>The difference</span>
          </div>
          <h2>
            Same prompt.
            <br />
            Different taste.
          </h2>
        </div>
      </div>

      <div className="mkt-comp-grid">
        {/* Generic side */}
        <div className="mkt-comp-side" data-reveal>
          <div className="mkt-comp-label">
            <div className="mkt-comp-dot" />
            <span className="mkt-comp-label-text">Any AI tool</span>
          </div>
          <div className="mkt-comp-body">
            <div className="mkt-g-hero">
              <h3>Welcome to Our Platform</h3>
              <p>The best solution for your needs</p>
              <div className="mkt-g-btn">Get Started</div>
            </div>
            <div
              className="grid gap-1.5 mb-3"
              style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
            >
              <div className="mkt-g-card">
                <div className="mkt-g-ic" />
                <h4>Feature One</h4>
                <p>Lorem ipsum dolor sit amet.</p>
              </div>
              <div className="mkt-g-card">
                <div className="mkt-g-ic" />
                <h4>Feature Two</h4>
                <p>Adipiscing elit sed do.</p>
              </div>
              <div className="mkt-g-card">
                <div className="mkt-g-ic" />
                <h4>Feature Three</h4>
                <p>Incididunt ut labore et.</p>
              </div>
            </div>
            <div className="mkt-g-bar" style={{ width: "70%" }} />
            <div className="mkt-g-bar" style={{ width: "50%" }} />
          </div>
        </div>

        {/* VS divider */}
        <div className="mkt-comp-vs">
          <span className="mkt-comp-vs-text">vs</span>
        </div>

        {/* Taste side */}
        <div className="mkt-comp-side taste" data-reveal>
          <div className="mkt-comp-label">
            <div className="mkt-comp-dot" />
            <span className="mkt-comp-label-text">Studio OS</span>
          </div>
          <div className="mkt-comp-body">
            <div className="mkt-t-hero">
              <div className="mkt-t-kicker">Case Study</div>
              <h3>
                Design at the
                <br />
                speed of thought
              </h3>
              <p>A new approach to creative tools</p>
              <div className="mkt-t-btn">Explore the work</div>
            </div>
            <div
              className="grid gap-1.5 mb-3"
              style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
            >
              <div className="mkt-t-card">
                <div className="mkt-t-bar" />
                <h4>Taste Engine</h4>
                <p>Extract patterns from refs</p>
              </div>
              <div className="mkt-t-card">
                <div className="mkt-t-bar" />
                <h4>Real Editor</h4>
                <p>Canvas feel, deep tools</p>
              </div>
              <div className="mkt-t-card">
                <div className="mkt-t-bar" />
                <h4>Clean Export</h4>
                <p>HTML + Tailwind</p>
              </div>
            </div>
            <div className="mkt-t-quote">
              &ldquo;Every reference shapes the output.&rdquo;
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-10">
        <p className="mkt-comp-caption" data-reveal>
          Same brief. Same prompt.{" "}
          <strong>The references made the difference.</strong>
        </p>
      </div>
    </section>
  );
}
