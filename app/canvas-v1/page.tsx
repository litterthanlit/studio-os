import type { Metadata } from "next";
import { CanvasPage } from "./canvas-client";
import { normalizeCanvasStage } from "@/lib/canvas/compose";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Canvas — Studio OS",
  description: "AI-powered design generator — moodboard to Framer-ready components",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; step?: string }>;
}) {
  const params = await Promise.resolve(searchParams);
  const normalizedStep = normalizeCanvasStage(params.step);
  if (params.project && params.step && normalizedStep && normalizedStep !== params.step) {
    redirect(
      `/canvas-v1?project=${encodeURIComponent(params.project)}&step=${normalizedStep}`
    );
  }
  return <CanvasPage projectId={params.project} initialStep={normalizedStep ?? undefined} />;
}
