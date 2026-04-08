"use client";

import { useEffect, useReducer } from "react";

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-services-script";
let googleIdentityScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(
        GOOGLE_IDENTITY_SCRIPT_ID,
      ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Google Identity script failed to load.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.id = GOOGLE_IDENTITY_SCRIPT_ID;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Google Identity script failed to load."));

      document.head.appendChild(script);
    });
  }

  return googleIdentityScriptPromise;
}

export function useGoogleIdentityScript(enabled: boolean) {
  const [status, dispatch] = useReducer(
    (
      _state: "error" | "idle" | "loading" | "ready",
      action: "error" | "idle" | "loading" | "ready",
    ) => action,
    enabled ? "loading" : "idle",
  );

  useEffect(() => {
    if (!enabled) {
      dispatch("idle");
      return;
    }

    let isMounted = true;
    dispatch("loading");

    void loadGoogleIdentityScript()
      .then(() => {
        if (isMounted) {
          dispatch("ready");
        }
      })
      .catch(() => {
        if (isMounted) {
          dispatch("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return status;
}
