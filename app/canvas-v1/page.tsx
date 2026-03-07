import type { Metadata } from "next";
import { CanvasPage } from "./canvas-client";

export const metadata: Metadata = {
  title: "Canvas — Studio OS",
  description: "AI-powered design generator — moodboard to Framer-ready components",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await Promise.resolve(searchParams);
  return <CanvasPage projectId={params.project} />;
}
