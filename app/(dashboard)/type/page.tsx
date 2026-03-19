import { redirect } from "next/navigation";

export const metadata = {
  title: "Type — Studio OS",
};

export default function TypePage() {
  redirect("/projects");
}
