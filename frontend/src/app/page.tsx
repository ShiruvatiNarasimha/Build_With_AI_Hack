import type { Metadata } from "next";
import LandingHero from "@/components/landing-hero";
import LandingFooter from "@/components/landing-footer";

export const metadata: Metadata = {
  title: "Crux AI - AI Creative Strategist",
  description:
    "AI creative strategist landing page focused on ad performance, conversion, and scale.",
};

export default function Home() {
  return (
    <>
      <LandingHero />
      <LandingFooter />
    </>
  );
}
