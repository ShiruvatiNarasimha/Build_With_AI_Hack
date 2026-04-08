import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign In | Crux AI",
  description: "Sign in to Crux AI with your Google account.",
};

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthShell mode="signin" />
    </Suspense>
  );
}

function AuthPageFallback() {
  return <div className="min-h-screen bg-[#fcfaf7]" />;
}
