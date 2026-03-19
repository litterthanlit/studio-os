import { UnifiedCanvasPage } from "@/app/canvas-v1/canvas-client";
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

  // V3: If URL has legacy `step` param, redirect once to clean URL without it
  if (params.step) {
    redirect(`/canvas?project=${encodeURIComponent(params.project)}`);
  }

  return <UnifiedCanvasPage projectId={params.project} />;
}
