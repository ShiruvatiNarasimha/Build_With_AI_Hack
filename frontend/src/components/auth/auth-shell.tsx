"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useAuth } from "@/hooks/use-auth";
import { AuthApiError } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

const authCopy = {
  signin: {
    alternateHref: "/signup",
    alternateLabel: "Sign up for an account",
    alternateText: "New to Crux?",
    emailPlaceholder: "Enter your email address",
    passwordHint: "Forgot Password?",
    passwordPlaceholder: "Enter your password",
    socialIntro: "Connect to Crux with:",
    submitLabel: "Log in",
    title: "Log in to Crux",
  },
  signup: {
    alternateHref: "/signin",
    alternateLabel: "Log in",
    alternateText: "Already have an account?",
    emailPlaceholder: "Enter your email address",
    passwordHint: "Use at least 8 characters",
    passwordPlaceholder: "Create a unique password",
    socialIntro: "Create your workspace with:",
    submitLabel: "Create account",
    title: "Create your Crux account",
  },
} as const;

const socialProviders = [
  { icon: GithubMark, label: "GitHub" },
  { icon: MicrosoftIcon, label: "Microsoft" },
  { icon: HasuraIcon, label: "Hasura" },
] as const;

export function AuthShell({ mode }: { mode: AuthMode }) {
  const copy = authCopy[mode];
  const { isAuthenticated, signInWithGoogle, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(
    () => searchParams.get("redirect") || "/dashboard",
    [searchParams],
  );
  const isBusy = isSubmitting || status === "loading";

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  const handleGoogleCredential = async (credential: string) => {
    try {
      setIsSubmitting(true);
      const session = await signInWithGoogle(credential);

      toast.success(
        mode === "signup"
          ? `Welcome to Crux, ${session.user.name || session.user.email}.`
          : `Signed in as ${session.user.name || session.user.email}.`,
      );

      router.replace(redirectTo);
    } catch (error) {
      const message =
        error instanceof AuthApiError
          ? error.message
          : "We could not complete Google authentication.";

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComingSoonProvider = (provider: string) => {
    toast.info(
      `${provider} sign-in is not connected yet. Google auth is live right now.`,
    );
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      toast.error("Enter your email and password to continue.");
      return;
    }

    toast.info(
      mode === "signup"
        ? "Google signup is connected now. Password signup can be enabled next without changing this UI."
        : "Google login is connected now. Password login can be enabled next without redesigning this screen.",
    );
  };

  const handleForgotPassword = () => {
    toast.info(
      "Forgot password flow is not connected yet. We can wire that next once password auth is enabled.",
    );
  };

  return (
    <div className="min-h-screen bg-[#040404] text-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(540px,1fr)]">
        <aside className="relative hidden overflow-hidden border-r border-white/8 bg-[#040404] lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(24,198,140,0.16),transparent_26%),radial-gradient(circle_at_82%_80%,rgba(255,136,39,0.18),transparent_24%),radial-gradient(circle_at_55%_35%,rgba(255,255,255,0.04),transparent_40%)]" />
          <HalftoneGlow
            className="left-0 top-0 h-[360px] w-[360px] opacity-70"
            color="rgba(50, 230, 170, 0.45)"
            origin="top-left"
          />
          <HalftoneGlow
            className="bottom-0 right-0 h-[360px] w-[360px] opacity-70"
            color="rgba(255, 138, 44, 0.45)"
            origin="bottom-right"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_18%,transparent_82%,rgba(255,255,255,0.03))]" />

          <div className="relative z-10 flex flex-1 items-center justify-center px-16">
            <div className="max-w-[520px] text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border border-emerald-400/25 bg-black/30 backdrop-blur-sm">
                <AuthLogoMark />
              </div>

              <h2 className="mt-10 font-display text-[clamp(3.25rem,5vw,4.75rem)] leading-[0.93] tracking-[-0.07em] text-white">
                Build winning systems without slowing down.
              </h2>

              <p className="mx-auto mt-6 max-w-[420px] text-lg leading-8 text-white/52">
                Product-grade authentication, sharp onboarding, and a premium
                first impression for the users landing in your app.
              </p>
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-screen items-center justify-center bg-[#040404] px-6 py-10 sm:px-10">
          <div className="w-full max-w-[438px]">
            <div className="mb-10 rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(39,199,142,0.16),transparent_38%),rgba(255,255,255,0.02)] p-6 lg:hidden">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-emerald-400/20 bg-black/25">
                <AuthLogoMark />
              </div>
              <p className="mt-6 max-w-[260px] font-display text-3xl leading-[1.05] tracking-[-0.06em] text-white">
                Build winning systems without slowing down.
              </p>
            </div>

            <Link
              href="/"
              className="mb-12 inline-flex items-center gap-3 text-lg text-white/90 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              Home
            </Link>

            <div className="text-center">
              <h1 className="font-display text-[clamp(2.6rem,5vw,3.8rem)] leading-none tracking-[-0.06em] text-white">
                {copy.title}
              </h1>
              <p className="mt-5 text-[1.15rem] text-white/80">
                {copy.socialIntro}
              </p>
            </div>

            <div className="mt-8 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative">
                  <GoogleAuthButton
                    disabled={isBusy}
                    mode={mode}
                    onCredential={handleGoogleCredential}
                    onError={(message) => toast.error(message)}
                    variant="auth-grid"
                  />
                  <span className="pointer-events-none absolute -top-2.5 right-4 rounded-full bg-[#31f29b] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-black">
                    Live
                  </span>
                </div>

                {socialProviders.map((provider) => (
                  <ProviderButton
                    key={provider.label}
                    icon={<provider.icon className="h-5 w-5" />}
                    label={provider.label}
                    onClick={() => handleComingSoonProvider(provider.label)}
                  />
                ))}
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-white/14" />
                <span className="text-[1.05rem] text-white/72">
                  Or continue with
                </span>
                <div className="h-px flex-1 bg-white/14" />
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label
                    htmlFor={`${mode}-email`}
                    className="block text-[1.05rem] font-medium text-white"
                  >
                    Email
                  </label>
                  <input
                    id={`${mode}-email`}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={copy.emailPlaceholder}
                    className={inputClassName}
                    autoComplete={mode === "signin" ? "email" : "username"}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <label
                      htmlFor={`${mode}-password`}
                      className="block text-[1.05rem] font-medium text-white"
                    >
                      Password
                    </label>

                    {mode === "signin" ? (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-base font-medium text-[#2997ff] transition-colors hover:text-[#5db1ff]"
                      >
                        {copy.passwordHint}
                      </button>
                    ) : (
                      <span className="text-sm text-white/42">
                        {copy.passwordHint}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      id={`${mode}-password`}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={copy.passwordPlaceholder}
                      className={cn(inputClassName, "pr-14")}
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-white/52 transition-colors hover:text-white"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="h-14 w-full rounded-xl border border-white/18 bg-white/[0.02] text-[1.2rem] font-medium text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copy.submitLabel}
                </button>
              </form>

              <div className="space-y-3 pt-2">
                <p className="text-[1.15rem] text-white/92">
                  {copy.alternateText}{" "}
                  <Link
                    href={copy.alternateHref}
                    className="font-medium text-[#2997ff] transition-colors hover:text-[#5db1ff]"
                  >
                    {copy.alternateLabel}
                  </Link>
                </p>

                <p className="text-sm leading-6 text-white/42">
                  Google authentication is fully connected to your backend.
                  Additional providers and password auth are represented in the
                  UI and can be activated next without redesigning the screen.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function HalftoneGlow({
  className,
  color,
  origin,
}: {
  className?: string;
  color: string;
  origin: "bottom-right" | "top-left";
}) {
  const maskDirection =
    origin === "top-left"
      ? "[mask-image:radial-gradient(circle_at_top_left,black_18%,transparent_74%)]"
      : "[mask-image:radial-gradient(circle_at_bottom_right,black_18%,transparent_74%)]";

  return (
    <div
      className={cn(
        "absolute bg-[radial-gradient(circle,_var(--dot-color)_22%,transparent_23%)] bg-[size:16px_16px]",
        maskDirection,
        className,
      )}
      style={
        {
          "--dot-color": color,
        } as CSSProperties
      }
    />
  );
}

function ProviderButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 items-center justify-center gap-3 rounded-xl border border-white/18 bg-transparent px-5 text-lg font-medium text-white transition hover:bg-white/[0.04]"
    >
      <span className="text-white">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function AuthLogoMark() {
  return (
    <svg
      width="62"
      height="62"
      viewBox="0 0 367 366"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M123.401 54.2645C129.088 48.5785 138.306 48.5785 143.992 54.2645L262.92 173.193C268.606 178.879 268.606 188.097 262.92 193.783L143.992 312.711C138.306 318.397 129.087 318.397 123.401 312.711L59.132 248.441C56.2894 245.598 56.2894 240.989 59.132 238.146L108.655 188.622C111.498 185.779 111.498 181.17 108.655 178.327L59.1457 128.816C56.303 125.973 56.3031 121.364 59.1457 118.521L123.401 54.2645ZM268.106 228.54C270.949 225.697 275.559 225.697 278.402 228.54L307.969 258.108C310.812 260.951 310.812 265.56 307.969 268.403L278.402 297.97C275.559 300.813 270.949 300.813 268.106 297.97L238.54 268.403C235.697 265.56 235.697 260.951 238.54 258.108L268.106 228.54Z"
        fill="url(#auth-logo-gradient)"
      />
      <defs>
        <linearGradient
          id="auth-logo-gradient"
          x1="73"
          y1="69"
          x2="301"
          y2="285"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#39f6b5" />
          <stop offset="1" stopColor="#17d48b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M3 3H11V11H3V3Z" fill="#F25022" />
      <path d="M13 3H21V11H13V3Z" fill="#7FBA00" />
      <path d="M3 13H11V21H3V13Z" fill="#00A4EF" />
      <path d="M13 13H21V21H13V13Z" fill="#FFB900" />
    </svg>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.22C2 16.73 4.87 20.55 8.84 21.9C9.34 21.99 9.52 21.68 9.52 21.42C9.52 21.18 9.51 20.37 9.5 19.3C6.73 19.92 6.14 18.09 6.14 18.09C5.68 16.88 5.03 16.56 5.03 16.56C4.12 15.92 5.1 15.93 5.1 15.93C6.1 16 6.62 16.99 6.62 16.99C7.52 18.58 8.97 18.12 9.54 17.85C9.63 17.18 9.89 16.72 10.18 16.46C7.97 16.2 5.65 15.31 5.65 11.31C5.65 10.17 6.04 9.24 6.69 8.5C6.58 8.24 6.24 7.17 6.79 5.72C6.79 5.72 7.63 5.44 9.5 6.74C10.3 6.51 11.15 6.39 12 6.38C12.85 6.39 13.7 6.51 14.5 6.74C16.37 5.44 17.21 5.72 17.21 5.72C17.76 7.17 17.42 8.24 17.31 8.5C17.96 9.24 18.35 10.17 18.35 11.31C18.35 15.32 16.02 16.19 13.8 16.45C14.16 16.78 14.48 17.43 14.48 18.42C14.48 19.84 14.47 20.98 14.47 21.42C14.47 21.68 14.65 22 15.16 21.9C19.13 20.55 22 16.73 22 12.22C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function HasuraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="#4E73FF" strokeWidth="2" />
      <path
        d="M9.25 7.9L14.75 16.1"
        stroke="#4E73FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14.7 7.85C15.85 8.22 16.78 9.15 17.15 10.3"
        stroke="#4E73FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.85 13.7C7.22 14.85 8.15 15.78 9.3 16.15"
        stroke="#4E73FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const inputClassName =
  "h-14 w-full rounded-xl border border-white/16 bg-white/[0.06] px-4 text-lg text-white placeholder:text-white/34 transition focus:border-white/30 focus:bg-white/[0.08] focus:outline-none";
