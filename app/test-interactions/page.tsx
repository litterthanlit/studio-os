import { Button } from "@/components/ui/button";

export default function TestInteractionsPage() {
  return (
    <main className="min-h-screen bg-bg-primary p-24 text-text-primary animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
      <div className="mx-auto max-w-2xl space-y-16">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-[-.015em] text-text-primary">
            Interactions & Transitions
          </h1>
          <p className="text-text-secondary text-sm">
            Testing micro-interactions from Prompts 13 and 14. 
            No bounces, deliberate ease-out motions, consistent 150-200ms durations.
          </p>
        </div>

        <section className="space-y-6">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wide border-b border-border-primary pb-2">
            Buttons (150ms transitions, Active 95% opacity)
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="accent">Soft Accent</Button>
            
            <div className="flex items-center gap-2 border-l border-border-primary pl-6">
              <Button variant="icon" title="Icon Example">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </Button>
              <Button variant="icon" title="Settings Example">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </Button>
            </div>
          </div>
          <p className="text-[12px] text-text-tertiary">
            * Tab through buttons to view the #D1E4FC focus rings.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wide border-b border-border-primary pb-2">
            Selected List Items
          </h2>
          <div className="w-[300px] border border-border-primary rounded-xl overflow-hidden bg-white">
            <div className="p-3 text-[14px] text-text-primary hover:bg-[#F4F8FF] transition-colors duration-150 cursor-pointer">
              General Settings
            </div>
            <div className="p-3 text-[14px] text-text-primary bg-[#F4F8FF] border-l-2 border-[#2430AD] cursor-pointer">
              Active Project Item
            </div>
            <div className="p-3 text-[14px] text-text-primary hover:bg-[#F4F8FF] transition-colors duration-150 cursor-pointer">
              Billing & Invoices
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wide border-b border-border-primary pb-2">
            Links & Text Elements
          </h2>
          <div className="text-[14px] text-text-primary">
            We use a minimal aesthetic, but standard hypertext links should remain accessible.
            Here is a <a href="#" className="text-[#2430AD] hover:underline transition-all">standard inline link</a> that receives an underline on hover.
          </div>
        </section>

      </div>
    </main>
  );
}
