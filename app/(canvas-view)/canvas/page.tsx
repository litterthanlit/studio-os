import { CanvasPage } from "@/app/canvas-v1/canvas-client";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Canvas — Studio OS",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  if (!params.project) {
    redirect("/home");
  }
  return <CanvasPage projectId={params.project} />;
}
