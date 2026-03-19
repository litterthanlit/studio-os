import { redirect } from "next/navigation";

export const metadata = {
  title: "Brief — Studio OS",
};

export default function BriefPage() {
  redirect("/projects");
}
