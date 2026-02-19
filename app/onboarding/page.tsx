import type { Metadata } from "next";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = {
  title: "Welcome — Studio OS",
  description: "Set up your studio in under two minutes.",
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
