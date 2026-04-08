"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  ChevronRight,
  Compass,
  Home,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "#overview", icon: Home, label: "Overview" },
  { href: "#workspace", icon: Compass, label: "Workspace" },
  { href: "#security", icon: ShieldCheck, label: "Security" },
];

export function DashboardShell() {
  const router = useRouter();
  const { signOut, status, user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const displayName = useMemo(() => {
    if (!user) {
      return "there";
    }

    return user.name || user.email.split("@")[0];
  }, [user]);

  const userInitial = useMemo(() => {
    return displayName.slice(0, 1).toUpperCase();
  }, [displayName]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin?redirect=/dashboard");
    }
  }, [router, status]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully.");
    router.replace("/signin");
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070a] text-white">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          Restoring your workspace...
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05070a] text-white">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-white/70">
          Redirecting to sign in...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-white">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/8 bg-[#090c12] px-5 py-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] transition-transform duration-300 lg:translate-x-0",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
                <span className="text-lg font-semibold text-emerald-300">
                  C
                </span>
              </div>
              <div>
                <div className="font-display text-lg tracking-[-0.04em] text-white">
                  Finvo
                </div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/35">
                  Dashboard
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70 transition hover:bg-white/[0.05] hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(39,199,142,0.18),transparent_42%),rgba(255,255,255,0.03)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-semibold text-white">
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {displayName}
                </div>
                <div className="truncate text-xs text-white/45">
                  {user.email}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/60">
              Signed in with Google and ready to explore your workspace.
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/72 transition hover:bg-white/[0.05] hover:text-white"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <Link
              href="/"
              className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.06] hover:text-white"
            >
              Back to landing
              <ChevronRight className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        {mobileSidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
          <header className="sticky top-0 z-20 border-b border-white/8 bg-[#05070a]/90 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 text-white/75 transition hover:bg-white/[0.05] hover:text-white lg:hidden"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">
                    Welcome back
                  </p>
                  <h1 className="font-display text-2xl tracking-[-0.05em] text-white sm:text-3xl">
                    Hello, {displayName}
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 sm:flex">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">
            <section
              id="overview"
              className="rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(39,199,142,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.24)] sm:p-8"
            >
              <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Workspace ready
                  </div>

                  <h2 className="mt-5 font-display text-[clamp(2.3rem,5vw,4.5rem)] leading-[0.92] tracking-[-0.07em] text-white">
                    Welcome to your dashboard, {displayName}.
                  </h2>

                  <p className="mt-5 max-w-xl text-base leading-8 text-white/62 sm:text-lg">
                    Your account is active and the session is live. This
                    dashboard is now the default destination after signup so
                    users land directly inside the product instead of bouncing
                    back to the landing page.
                  </p>
                </div>

                <div className="grid w-full max-w-md gap-4 sm:grid-cols-2 xl:max-w-sm xl:grid-cols-1">
                  <DashboardStatCard
                    label="User name"
                    value={displayName}
                    tone="emerald"
                  />
                  <DashboardStatCard
                    label="Account email"
                    value={user.email}
                    tone="blue"
                  />
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <section
                id="workspace"
                className="rounded-[28px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.16)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-emerald-300">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Product-ready dashboard shell
                    </h3>
                    <p className="text-sm text-white/45">
                      Sidebar navigation, protected route handling, and user
                      identity are all connected.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <FeatureCard
                    description="Users are redirected here right after Google signup."
                    title="Post-signup flow"
                  />
                  <FeatureCard
                    description="The dashboard reads the authenticated user and welcomes them by name."
                    title="Personalized greeting"
                  />
                  <FeatureCard
                    description="Unauthenticated visits are redirected back to sign in."
                    title="Protected access"
                  />
                </div>
              </section>

              <section
                id="security"
                className="rounded-[28px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.16)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-blue-300">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Session summary
                    </h3>
                    <p className="text-sm text-white/45">
                      Details available from the current authenticated session.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <SummaryRow label="Name" value={displayName} />
                  <SummaryRow label="Email" value={user.email} />
                  <SummaryRow
                    label="Email verified"
                    value={user.emailVerified ? "Verified" : "Pending"}
                  />
                  <SummaryRow
                    label="Joined"
                    value={new Date(user.createdAt).toLocaleDateString()}
                  />
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function DashboardStatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "emerald";
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-4",
        tone === "emerald"
          ? "border-emerald-400/16 bg-emerald-400/[0.07]"
          : "border-blue-400/16 bg-blue-400/[0.07]",
      )}
    >
      <div className="text-xs uppercase tracking-[0.22em] text-white/35">
        {label}
      </div>
      <div className="mt-3 truncate text-lg font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function FeatureCard({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <p className="mt-2 text-sm leading-6 text-white/52">{description}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <span className="text-sm text-white/45">{label}</span>
      <span className="max-w-[60%] truncate text-right text-sm font-medium text-white">
        {value}
      </span>
    </div>
  );
}
