import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard | Crux AI",
  description: "Authenticated dashboard for signed-in Crux users.",
};

export default function DashboardPage() {
  return <DashboardShell />;
}
