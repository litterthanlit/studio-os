import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const params = await Promise.resolve(searchParams);
  if (params.project) {
    redirect(`/canvas?project=${encodeURIComponent(params.project)}`);
  }
  redirect("/canvas");
}
