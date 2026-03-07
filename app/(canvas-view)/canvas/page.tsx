import { CanvasClient } from "./canvas-client";

export const metadata = {
  title: "Canvas — Studio OS",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return <CanvasClient />;
}
