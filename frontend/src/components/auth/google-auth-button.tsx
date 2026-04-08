"use client";

import { useCallback, useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { useGoogleIdentityScript } from "@/hooks/use-google-identity-script";
import { clientEnv } from "@/lib/env";

const buttonTextByMode = {
  signin: "signin_with",
  signup: "signup_with",
} as const;

interface GoogleAuthButtonProps {
  disabled?: boolean;
  mode: "signin" | "signup";
  onCredential: (credential: string) => Promise<void> | void;
  onError?: (message: string) => void;
  variant?: "auth-grid" | "default";
}

export function GoogleAuthButton({
  disabled = false,
  mode,
  onCredential,
  onError,
  variant = "default",
}: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scriptStatus = useGoogleIdentityScript(Boolean(clientEnv.googleClientId));
  const isAuthGrid = variant === "auth-grid";

  const renderGoogleButton = useCallback(() => {
    if (!containerRef.current || !window.google?.accounts?.id) {
      return;
    }

    containerRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      auto_select: false,
      callback: async (response) => {
        if (!response.credential) {
          onError?.("Google did not return a credential token.");
          return;
        }

        await onCredential(response.credential);
      },
      client_id: clientEnv.googleClientId,
      itp_support: true,
      use_fedcm_for_prompt: true,
      ux_mode: "popup",
    });

    window.google.accounts.id.renderButton(containerRef.current, {
      logo_alignment: "left",
      shape: isAuthGrid ? "rectangular" : "pill",
      size: "large",
      text: isAuthGrid ? "continue_with" : buttonTextByMode[mode],
      theme: isAuthGrid ? "filled_black" : "outline",
      type: "standard",
      width: Math.max(containerRef.current.offsetWidth, 280),
    });
  }, [isAuthGrid, mode, onCredential, onError]);

  useEffect(() => {
    if (scriptStatus !== "ready") {
      return;
    }

    renderGoogleButton();

    if (!containerRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      renderGoogleButton();
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [renderGoogleButton, scriptStatus]);

  if (!clientEnv.googleClientId) {
    return (
      <div
        className={
          isAuthGrid
            ? "flex h-12 items-center justify-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 text-sm text-amber-100"
            : "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        }
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div>
          Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env` to enable the
          Google sign-in flow.
        </div>
      </div>
    );
  }

  if (scriptStatus === "loading" || scriptStatus === "idle") {
    return (
      <div
        className={
          isAuthGrid
            ? "flex h-12 items-center justify-center rounded-xl border border-white/18 bg-black/30 text-base text-white/72"
            : "flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm text-zinc-500 shadow-sm"
        }
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading Google sign-in...
      </div>
    );
  }

  if (scriptStatus === "error") {
    return (
      <div
        className={
          isAuthGrid
            ? "flex h-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm text-red-100"
            : "rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        }
      >
        We could not load Google Identity Services. Refresh the page and try
        again.
      </div>
    );
  }

  return (
    <div
      className={
        disabled
          ? "pointer-events-none opacity-60"
          : undefined
      }
    >
      <div
        ref={containerRef}
        className={isAuthGrid ? "min-h-12 w-full overflow-hidden rounded-xl" : "min-h-11 w-full"}
      />
    </div>
  );
}
