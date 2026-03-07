import { CanvasPage } from "@/app/canvas-v1/canvas-client";

export const metadata = {
  title: "Canvas — Studio OS",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  return <CanvasPage projectId={params.project} />;
}
