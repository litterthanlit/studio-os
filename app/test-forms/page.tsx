export default function TestFormsPage() {
  return (
    <main className="min-h-screen bg-bg-primary p-24 text-text-primary">
      <div className="mx-auto max-w-md space-y-12">
        <div className="space-y-4">
          <h1 className="text-2xl font-serif">Form Elements</h1>
          <p className="text-text-secondary text-sm">
            Testing the clinical and precise form language.
          </p>
        </div>

        <div className="space-y-8">
          {/* Default Input */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-wide">Project Name</label>
            <input 
              type="text" 
              placeholder="e.g. Acme Rebrand"
              className="flex h-10 w-full border border-border-primary bg-bg-input px-3 py-2 rounded-lg text-sm font-sans text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-[var(--accent-pill)] focus:shadow-[0_0_0_3px_rgba(209,228,252,0.5)] transition-[border-color,background-color,box-shadow] duration-200 ease-out"
            />
          </div>

          {/* Error Input */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-wide">Target Audience</label>
            <input 
              type="text" 
              defaultValue="Invalid audience format"
              className="flex h-10 w-full border border-[#EF4444] bg-[#FEF2F2] px-3 py-2 rounded-lg text-sm font-sans text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-[#EF4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)] transition-[border-color,background-color,box-shadow] duration-200 ease-out"
            />
            <p className="text-[12px] text-[#EF4444]">This field is required.</p>
          </div>

          {/* Select */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-text-secondary uppercase tracking-wide">Brand Vibe</label>
            <div className="relative w-full">
              <select className="flex h-10 w-full appearance-none border border-border-primary bg-bg-input px-3 py-2 pr-10 rounded-lg text-sm font-sans text-text-primary focus:outline-none focus:border-[var(--accent-pill)] focus:shadow-[0_0_0_3px_rgba(209,228,252,0.5)] transition-[border-color,background-color,box-shadow] duration-200 ease-out">
                <option>Minimal & Clean</option>
                <option>Bold & Playful</option>
                <option>Corporate & Trusted</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 text-text-placeholder" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Togles */}
          <div className="space-y-4 pt-4 border-t border-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-text-primary">Enable AI Analysis</label>
                <p className="text-[12px] text-text-secondary">Extract design DNA from images</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 rounded-full peer-focus:outline-none bg-border-primary peer-checked:bg-[var(--accent)] peer-focus:ring-2 peer-focus:ring-[var(--accent-pill)] peer-focus:ring-offset-1 peer-focus:ring-offset-bg-primary transition-colors duration-200 ease-out after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:shadow-sm after:rounded-full after:h-4 after:w-4 after:transition-all after:duration-200 peer-checked:after:translate-x-[16px]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-text-primary">Public Deploy</label>
                <p className="text-[12px] text-text-secondary">Make template available to everyone</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-9 h-5 rounded-full peer-focus:outline-none bg-border-primary peer-checked:bg-[var(--accent)] peer-focus:ring-2 peer-focus:ring-[var(--accent-pill)] peer-focus:ring-offset-1 peer-focus:ring-offset-bg-primary transition-colors duration-200 ease-out after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:shadow-sm after:rounded-full after:h-4 after:w-4 after:transition-all after:duration-200 peer-checked:after:translate-x-[16px]"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
