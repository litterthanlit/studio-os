import type { Metadata } from "next";
import { ComponentGalleryPageClient } from "./component-gallery-client";

export const metadata: Metadata = {
  title: "Components — Studio OS",
  description: "Browse section templates and UI primitives with live HTML previews.",
};

export default function ComponentGalleryPage() {
  return <ComponentGalleryPageClient />;
}
