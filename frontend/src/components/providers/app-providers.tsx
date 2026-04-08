"use client";

import { ThemeProvider } from "next-themes";

import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem={false}
    >
      <AuthProvider>
        <TooltipProvider>
          {children}
          <Toaster closeButton position="top-right" richColors />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
