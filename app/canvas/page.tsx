import type { Metadata } from "next";
import { CanvasPage } from "./canvas-client";

export const metadata: Metadata = {
  title: "Canvas — Studio OS",
  description: "AI-powered design generator — moodboard to Framer-ready components",
};

export default function Page() {
  return <CanvasPage />;
}
