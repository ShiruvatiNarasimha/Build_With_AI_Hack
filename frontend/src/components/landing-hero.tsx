"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS = [
  { href: "/blogs", label: "Blogs" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "#careers", label: "Careers" },
  { href: "/about", label: "Team" },
  { href: "/pricing", label: "Pricing" },
];
const HERO_WORDS = ["work.", "convert.", "scale.", "trend."];

const bgGridUrl =
  "https://cdn.prod.website-files.com/65783e649367bc55fecaea2d/65a15ff34f2dc4ded14b40e1_BG%20Grids%20hero.svg";

export default function LandingHero() {
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const { signOut, status, user } = useAuth();

  const userLabel = useMemo(() => {
    if (!user) {
      return null;
    }

    return user.name || user.email.split("@")[0];
  }, [user]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveWordIndex(
        (currentIndex) => (currentIndex + 1) % HERO_WORDS.length,
      );
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <main className="flex-1 bg-white">
      <section className="relative flex w-full flex-col items-center overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src={bgGridUrl}
            alt="Background grid"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 z-10 opacity-20">
          <div className="absolute top-[25%] h-px w-full overflow-hidden bg-black/5">
            <div className="hero-line h-full w-20 bg-gradient-to-r from-gray-300 to-black" />
          </div>
          <div className="absolute top-[50%] h-px w-full overflow-hidden bg-black/5">
            <div
              className="hero-line h-full w-20 bg-gradient-to-r from-gray-300 to-black"
              style={{ animationDelay: "1s" }}
            />
          </div>
        </div>

        <nav className="fixed top-4 left-1/2 z-30 flex w-[calc(100%-1.5rem)] max-w-[860px] -translate-x-1/2 items-center justify-between rounded-2xl border border-white/20 bg-white/60 px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md sm:top-8 sm:w-[90%] sm:px-4">
          <Link
            href="/"
            className="flex items-center"
            aria-label="Crux AI home"
          >
            <NavLogo />
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-[#262e35] transition-colors hover:text-[#ff4500]"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {status === "authenticated" && userLabel ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-3 rounded-full border border-black/5 bg-white/80 px-2 py-1 pr-3 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white">
                  {userLabel.slice(0, 1).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="max-w-[140px] truncate text-sm font-semibold text-zinc-900">
                    {userLabel}
                  </div>
                  <div className="max-w-[140px] truncate text-xs text-zinc-500">
                    {user?.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void signOut();
                }}
                className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 sm:text-sm"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/signin"
                className="hidden rounded-lg px-4 py-2 text-sm font-medium text-[#262e35] transition-colors hover:bg-black/5 sm:inline-flex"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 sm:text-sm"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing
                  </>
                ) : (
                  "Sign Up"
                )}
              </Link>
            </div>
          )}
        </nav>

        <div className="relative z-20 flex w-full max-w-[1180px] flex-col items-center px-5 pb-20 pt-36 text-center sm:px-10 sm:pb-28 sm:pt-48">
          {/* <div className="mb-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-black/5 bg-white/80 px-4 py-2 text-sm text-zinc-600 shadow-sm backdrop-blur-sm">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#ff4500]" />
            Google-first auth is live and backed by your new Express + Prisma API
          </div> */}

          <div className="mb-8 space-y-2">
            <h1 className="font-display text-[clamp(2.9rem,7vw,3.8rem)] leading-[1.1] font-light tracking-[-1.5px] text-[#262e35]">
              Global Valuation Data
            </h1>
            <h2 className="font-display text-[clamp(2.65rem,6.8vw,3.6rem)] leading-[1.1] font-medium tracking-[-1.5px] text-[#262e35]">
              AI Insights{" "}
              <span
                key={HERO_WORDS[activeWordIndex]}
                className="text-gradient word-fade inline-block min-w-[3.9ch]"
              >
                {HERO_WORDS[activeWordIndex]}
              </span>
            </h2>
            <p className="mx-auto mt-2 max-w-[600px] text-[clamp(1.1rem,2.6vw,1.375rem)] leading-[1.5] font-light tracking-[-0.2px] text-[#31373d]">
              Build comps in minutes, not days. Generate clean, defensible
              multiples with AI, create dynamic peer sets instantly, and export
              straight to Excel. No $20K data subscriptions. No manual grind.
            </p>
          </div>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-3 sm:mb-14">
            {status === "authenticated" ? (
              <>
                <span className="rounded-full border border-black/10 bg-white/80 px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm">
                  Signed in as {userLabel}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(132deg,#FF4602_0%,#FF5892_100%)] px-6 py-4 text-lg font-semibold text-white shadow-[0_-1px_6px_0_rgba(0,0,0,0.12),0_1px_6px_0_rgba(0,0,0,0.12)] transition-transform duration-300 hover:scale-105"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(132deg,#FF4602_0%,#FF5892_100%)] px-6 py-4 text-lg font-semibold text-white shadow-[0_-1px_6px_0_rgba(0,0,0,0.12),0_1px_6px_0_rgba(0,0,0,0.12)] transition-transform duration-300 hover:scale-105"
                >
                  Create Account
                </Link>
                <Link
                  href="/signin"
                  className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white/85 px-6 py-4 text-lg font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-white"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          <div className="group relative aspect-[1180/688] w-full max-w-[1180px]">
            {/* <div className="h-full w-full overflow-hidden rounded-[19.2px] shadow-[0_62px_62px_0_rgba(56,62,71,0.03),0_38px_38px_0_rgba(56,62,71,0.04),0_24px_24px_0_rgba(56,62,71,0.02),0_18px_14px_0_rgba(56,62,71,0.05),0_7px_7px_0_rgba(56,62,71,0.04),0_4px_4px_0_rgba(56,62,71,0.03),0_2px_2px_0_rgba(20,65,150,0.1),0_-8px_80px_0_rgba(38,109,240,0.05)]">
              <Image
                src={heroPreviewUrl}
                alt="Web layout preview"
                fill
                sizes="(min-width: 1280px) 1180px, 100vw"
                className="rounded-[11px] object-cover"
              />
            </div> */}

            {/* <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="play-button-pulse absolute inset-0 rounded-full" />
                <button
                  type="button"
                  aria-label="Play hero video"
                  className="group/play relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-black/30 shadow-xl backdrop-blur-sm transition-transform duration-300 hover:scale-110"
                >
                  <PlayIcon />
                </button>
              </div>
            </div> */}
          </div>
        </div>
      </section>
    </main>
  );
}

function NavLogo() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 367 366"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M123.401 54.2645C129.088 48.5785 138.306 48.5785 143.992 54.2645L262.92 173.193C268.606 178.879 268.606 188.097 262.92 193.783L143.992 312.711C138.306 318.397 129.087 318.397 123.401 312.711L59.132 248.441C56.2894 245.598 56.2894 240.989 59.132 238.146L108.655 188.622C111.498 185.779 111.498 181.17 108.655 178.327L59.1457 128.816C56.303 125.973 56.3031 121.364 59.1457 118.521L123.401 54.2645ZM268.106 228.54C270.949 225.697 275.559 225.697 278.402 228.54L307.969 258.108C310.812 260.951 310.812 265.56 307.969 268.403L278.402 297.97C275.559 300.813 270.949 300.813 268.106 297.97L238.54 268.403C235.697 265.56 235.697 260.951 238.54 258.108L268.106 228.54Z"
        fill="url(#nav-logo-gradient)"
      />
      <defs>
        <linearGradient
          id="nav-logo-gradient"
          x1="73"
          y1="69"
          x2="301"
          y2="285"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF7541" />
          <stop offset="1" stopColor="#F64300" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="24"
      height="27"
      viewBox="0 0 19 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="ml-1 text-white"
      aria-hidden="true"
    >
      <path
        d="M15.6125 8.11084C17.0884 8.96298 17.8264 9.389 18.074 9.94529C18.2901 10.4304 18.2901 10.9845 18.074 11.4697C17.8264 12.0259 17.0884 12.452 15.6125 13.304L4.93103 19.471C3.45515 20.3231 2.7172 20.7492 2.11166 20.6855C1.58348 20.63 1.10365 20.353 0.791484 19.9233C0.433594 19.4308 0.433594 18.5786 0.433594 16.8744V4.54049C0.433594 2.83627 0.433594 1.98416 0.791494 1.49157C1.10365 1.06191 1.58348 0.784883 2.11166 0.729365C2.7172 0.665724 3.45515 1.09178 4.93103 1.94389L15.6125 8.11084Z"
        fill="currentColor"
      />
    </svg>
  );
}
