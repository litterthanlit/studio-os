import type { Metadata } from "next";
import { HomeClient } from "./home-client";

export const metadata: Metadata = {
  title: "Home — Studio OS",
};

export default function HomePage() {
  return <HomeClient />;
}
