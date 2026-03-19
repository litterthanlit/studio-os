import { redirect } from "next/navigation";

export const metadata = {
  title: "Vision — Studio OS",
};

export default function VisionPage() {
  redirect("/projects");
}
