import { redirect } from "next/navigation";

export const metadata = {
  title: "Flow — Studio OS",
};

export default function FlowPage() {
  redirect("/projects");
}
