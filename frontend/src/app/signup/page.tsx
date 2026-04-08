import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign Up | Crux AI",
  description: "Create your Crux AI account with your Google account.",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthShell mode="signup" />
    </Suspense>
  );
}

function AuthPageFallback() {
  return <div className="min-h-screen bg-[#fcfaf7]" />;
}
