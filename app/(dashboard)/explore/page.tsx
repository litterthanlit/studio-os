import { redirect } from "next/navigation";

export const metadata = {
  title: "Explore — Studio OS",
};

export default function ExplorePage() {
  redirect("/projects");
}
