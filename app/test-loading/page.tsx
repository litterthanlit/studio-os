'use client';

import * as React from "react";
import { Skeleton, ProgressBar, Spinner, Stepper } from "@/components/ui/loading";
import { Card, CardContent } from "@/components/ui/card";

export default function TestLoadingPage() {
  const [progress, setProgress] = React.useState(0);
  const [step, setStep] = React.useState(1);

  React.useEffect(() => {
    const pTimer = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 10));
    }, 1000);

    const sTimer = setInterval(() => {
      setStep((prev) => (prev >= 4 ? 0 : prev + 1));
    }, 2000);

    return () => {
      clearInterval(pTimer);
      clearInterval(sTimer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-bg-primary p-24 text-text-primary">
      <div className="mx-auto max-w-2xl space-y-16">
        <div className="space-y-4">
          <h1 className="text-2xl font-serif">Loading & Progress States</h1>
          <p className="text-text-secondary text-sm">
            Testing components from Prompt 10.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wide">Skeleton Loader</h2>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-3 gap-6">
              <Skeleton className="h-[200px]" />
              <Skeleton className="h-[200px]" />
              <Skeleton className="h-[200px]" />
            </div>
            <div className="flex gap-4 items-center">
              <Skeleton className="h-10 w-10 !rounded-full shrink-0" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wide">Progress Bar</h2>
          <Card>
            <CardContent className="pt-6">
              <ProgressBar progress={progress} />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wide">Spinner</h2>
          <Card>
            <CardContent className="pt-6 flex justify-center py-12">
              <Spinner />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-[13px] font-medium text-text-secondary uppercase tracking-wide">Stepper</h2>
          <Card>
            <CardContent className="pt-6 py-12 flex justify-center">
              <Stepper 
                steps={["References", "Analysis", "Design System", "Generation"]} 
                currentStep={step} 
              />
            </CardContent>
          </Card>
        </section>

      </div>
    </main>
  );
}
