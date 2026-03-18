import type { Metadata } from "next";
import { RemoteControlPage } from "./remote-client";

export const metadata: Metadata = {
  title: "Remote Control — Studio OS",
  description: "Control your Studio OS canvas from another device",
};

export default function Page() {
  return <RemoteControlPage />;
}
