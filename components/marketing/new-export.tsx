"use client";

export function MarketingExport() {
  return (
    <section className="mkt-export" id="export">
      <div className="max-w-[1120px] mx-auto px-10">
        <div
          className="grid items-center gap-14"
          style={{ gridTemplateColumns: "1fr 1.1fr" }}
        >
          <div className="mkt-export-text" data-reveal>
            <div className="mkt-section-rule">
              <span>Export</span>
            </div>
            <h2>
              Real code.
              <br />
              Not a proprietary format.
            </h2>
            <p>
              Copy clean HTML with inline styles. Paste into any project. No
              vendor lock-in, no framework dependency.
            </p>
          </div>

          <div className="mkt-export-code" data-reveal>
            <div className="mkt-export-code-chrome">
              <div />
              <div />
              <div />
              <span>Copy HTML</span>
            </div>
            <div className="mkt-export-code-body">
              <span className="mkt-c-tag">&lt;section</span>{" "}
              <span className="mkt-c-attr">style</span>=
              <span className="mkt-c-val">
                &quot;padding: 64px 32px;
                {"\n"}
                {"  "}background: linear-gradient(168deg,{"\n"}
                {"    "}#0C0F1D, #1B2654);&quot;
              </span>
              <span className="mkt-c-tag">&gt;</span>
              {"\n"}
              {"  "}
              <span className="mkt-c-tag">&lt;p</span>{" "}
              <span className="mkt-c-attr">style</span>=
              <span className="mkt-c-val">
                &quot;font-size: 10px;{"\n"}
                {"    "}text-transform: uppercase;{"\n"}
                {"    "}letter-spacing: 2px;{"\n"}
                {"    "}color: rgba(255,255,255,0.3);&quot;
              </span>
              <span className="mkt-c-tag">&gt;</span>
              {"\n"}
              {"    "}
              <span className="mkt-c-txt">Case Study</span>
              {"\n"}
              {"  "}
              <span className="mkt-c-tag">&lt;/p&gt;</span>
              {"\n"}
              {"  "}
              <span className="mkt-c-tag">&lt;h1</span>{" "}
              <span className="mkt-c-attr">style</span>=
              <span className="mkt-c-val">
                &quot;font-size: 48px;{"\n"}
                {"    "}font-weight: 500;{"\n"}
                {"    "}letter-spacing: -0.03em;{"\n"}
                {"    "}color: white;&quot;
              </span>
              <span className="mkt-c-tag">&gt;</span>
              {"\n"}
              {"    "}
              <span className="mkt-c-txt">
                Design at the speed of thought
              </span>
              {"\n"}
              {"  "}
              <span className="mkt-c-tag">&lt;/h1&gt;</span>
              {"\n"}
              <span className="mkt-c-tag">&lt;/section&gt;</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
