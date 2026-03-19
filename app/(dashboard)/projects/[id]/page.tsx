import { redirect } from "next/navigation";

export default async function ProjectRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/canvas?project=${encodeURIComponent(id)}`);
}
