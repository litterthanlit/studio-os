import { FeaturesGrid } from "@/components/marketing/features-grid";
import { FeatureShowcase } from "@/components/marketing/feature-showcase";

export default function TestPage() {
  return (
    <main className="min-h-screen bg-black">
      <div className="border-b border-neutral-800 py-8 text-center">
        <h1 className="text-xl font-medium text-white">Test Page</h1>
        <p className="mt-2 text-sm text-neutral-500">
          If you can see this, the page is rendering
        </p>
      </div>
      
      <FeaturesGrid />
      
      <div className="h-px bg-neutral-800" />
      
      <FeatureShowcase />
    </main>
  );
}
