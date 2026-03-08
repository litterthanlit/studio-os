import { CanvasPage } from "@/app/canvas-v1/canvas-client";
import { normalizeCanvasStage } from "@/lib/canvas/compose";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Canvas — Studio OS",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; step?: string }>;
}) {
  const params = await Promise.resolve(searchParams);
  if (!params.project) {
    redirect("/home");
  }
  const normalizedStep = normalizeCanvasStage(params.step);
  if (params.step && normalizedStep && normalizedStep !== params.step) {
    redirect(`/canvas?project=${encodeURIComponent(params.project)}&step=${normalizedStep}`);
  }
  return <CanvasPage projectId={params.project} initialStep={normalizedStep ?? undefined} />;
}
