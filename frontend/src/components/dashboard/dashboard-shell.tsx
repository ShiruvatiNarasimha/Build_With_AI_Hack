"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowRightLeft,
  ArrowUp,
  Atom,
  BadgeDollarSign,
  BotMessageSquare,
  ChartLine,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftOpen,
  Paperclip,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  streamValuationAgent,
  type AgentStep,
  type ValuationStreamResult,
} from "@/lib/valuation-client";
import { AgentInsightsPanel } from "./agent-insights-panel";

/* ─── Types & Constants ─── */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const WORKSPACE_SECTIONS = [
  {
    id: "valuation",
    label: "Valuation Suite",
    description: "Run DCF, comps, and scenario analysis.",
    icon: ChartLine,
    accent: {
      active: "border-l-blue-500 bg-blue-50/70",
      iconBg: "bg-blue-100 text-blue-600",
      dot: "bg-blue-500",
    },
  },
  {
    id: "erp",
    label: "Equity Risk Premium",
    description: "Track implied and historical ERP signals.",
    icon: BadgeDollarSign,
    accent: {
      active: "border-l-emerald-500 bg-emerald-50/70",
      iconBg: "bg-emerald-100 text-emerald-600",
      dot: "bg-emerald-500",
    },
  },
  {
    id: "fx",
    label: "Foreign Exchange",
    description: "Monitor currency pairs and macro trends.",
    icon: ArrowRightLeft,
    accent: {
      active: "border-l-violet-500 bg-violet-50/70",
      iconBg: "bg-violet-100 text-violet-600",
      dot: "bg-violet-500",
    },
  },
] as const;

const SUGGESTIONS = [
  "What's Tesla's current valuation based on DCF?",
  "Analyze Apple's equity risk premium trends",
  "Compare NVIDIA vs AMD market positioning",
  "What are the key drivers for Microsoft's stock?",
];

/* ─── Main Component ─── */

export function DashboardShell() {
  const { accessToken, status, user, signOut } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const [insightsComplete, setInsightsComplete] = useState(false);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("valuation");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  const recentChats = messages
    .filter((m) => m.role === "user")
    .map((m) => ({ id: m.id, text: m.content, timestamp: m.timestamp }))
    .slice(-6)
    .reverse();

  const handleNewChat = () => {
    setMessages([]);
    setAgentSteps([]);
    setShowInsights(false);
    setInsightsComplete(false);
    setTotalDuration(null);
    setInputValue("");
    textareaRef.current?.focus();
  };

  const handleSubmit = useCallback(
    async (question?: string) => {
      const q = (question ?? inputValue).trim();
      if (!q || isProcessing) return;

      if (!accessToken) {
        toast.error("Please sign in to use the valuation agent.");
        return;
      }

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: q,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      setAgentSteps([]);
      setShowInsights(true);
      setIsProcessing(true);
      setTotalDuration(null);
      setInsightsComplete(false);

      try {
        await streamValuationAgent(
          { accessToken, question: q },
          {
            onStep: (step) => {
              setAgentSteps((prev) => {
                const idx = prev.findIndex((s) => s.id === step.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = { ...updated[idx], ...step };
                  return updated;
                }
                return [...prev, step];
              });
            },
            onComplete: (result: ValuationStreamResult) => {
              const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: result.answer,
                timestamp: Date.now(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setTotalDuration(result.timing?.totalDuration ?? null);
              setInsightsComplete(true);
            },
            onError: (error) => {
              toast.error(error.message);
            },
          },
        );
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Failed to get a response.";
        toast.error(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    [inputValue, isProcessing, accessToken],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasMessages = messages.length > 0;
  const canSend =
    inputValue.trim().length > 0 &&
    !isProcessing &&
    status === "authenticated";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fb] font-sans antialiased">
      {/* ─── LEFT: Thinking Panel ─── */}
      <div
        className={`hidden shrink-0 border-r border-slate-200/60 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden lg:block ${
          showInsights ? "w-[370px]" : "w-0"
        }`}
      >
        <div className="h-full w-[370px]">
          <AgentInsightsPanel
            steps={agentSteps}
            isActive={isProcessing}
            isComplete={insightsComplete}
            totalDuration={totalDuration}
            onClose={() => setShowInsights(false)}
          />
        </div>
      </div>

      {/* Mobile Thinking Panel Overlay */}
      {showInsights && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
            onClick={() => setShowInsights(false)}
            aria-label="Close insights"
          />
          <aside className="relative h-full w-[340px] border-r border-slate-200 bg-white shadow-2xl">
            <AgentInsightsPanel
              steps={agentSteps}
              isActive={isProcessing}
              isComplete={insightsComplete}
              totalDuration={totalDuration}
              onClose={() => setShowInsights(false)}
            />
          </aside>
        </div>
      )}

      {/* ─── CENTER: Chat ─── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-2.5 lg:px-6">
            <div className="flex items-center gap-2">
              {/* Mobile: insights toggle */}
              {!showInsights && hasMessages && (
                <button
                  type="button"
                  onClick={() => setShowInsights(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                  title="Show agent insights"
                >
                  <PanelLeftOpen size={15} />
                </button>
              )}
              <div className="flex items-center gap-2 lg:hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-900">
                  <Zap size={12} className="text-white" />
                </div>
                <span className="text-sm font-bold text-slate-900">
                  Crux AI
                </span>
              </div>
              <div className="hidden items-center gap-1.5 lg:flex">
                <span className="text-xs font-medium text-slate-400">
                  {WORKSPACE_SECTIONS.find((s) => s.id === activeSection)
                    ?.label ?? "Workspace"}
                </span>
                {hasMessages && (
                  <>
                    <ChevronRight size={12} className="text-slate-300" />
                    <span className="max-w-[240px] truncate text-xs font-medium text-slate-700">
                      {messages.find((m) => m.role === "user")?.content}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                title="Search"
              >
                <Search size={15} />
              </button>
              {/* Mobile sidebar toggle */}
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm lg:hidden"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <WelcomeView
              onSuggestionClick={(s) => {
                setInputValue(s);
                handleSubmit(s);
              }}
              isAuthenticated={status === "authenticated"}
            />
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
              <div className="space-y-6">
                {messages.map((msg) =>
                  msg.role === "user" ? (
                    <UserBubble
                      key={msg.id}
                      message={msg}
                      userName={user?.name}
                    />
                  ) : (
                    <AssistantBubble key={msg.id} message={msg} />
                  ),
                )}

                {isProcessing && (
                  <div className="flex items-start gap-3 msg-appear">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 shadow-sm">
                      <BotMessageSquare size={14} className="text-white" />
                    </div>
                    <div className="rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="typing-dots flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-teal-400" />
                          <span className="h-2 w-2 rounded-full bg-teal-400" />
                          <span className="h-2 w-2 rounded-full bg-teal-400" />
                        </div>
                        <span className="text-xs text-slate-400">
                          Agent is thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200/60 bg-white px-4 pb-4 pt-3 lg:px-6 lg:pb-5 lg:pt-4">
          <div className="mx-auto max-w-3xl">
            <form
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all focus-within:border-slate-300 focus-within:shadow-[0_4px_32px_rgba(0,0,0,0.08)]"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <div className="px-4 pb-2 pt-3">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    resizeTextarea();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a valuation question..."
                  rows={1}
                  className="w-full resize-none border-0 bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
                  disabled={isProcessing}
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    title="Attach file"
                  >
                    <Paperclip size={15} />
                  </button>
                  <ToolPill icon={Atom} label="Advanced Reasoning" />
                  <ToolPill icon={Sparkles} label="Deep Analysis" />
                </div>

                <button
                  type="submit"
                  disabled={!canSend}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                    canSend
                      ? "bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-95"
                      : "cursor-not-allowed bg-slate-100 text-slate-300"
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ArrowUp size={16} />
                  )}
                </button>
              </div>
            </form>

            <p className="mt-2 text-center text-[11px] text-slate-400">
              Crux AI may produce inaccurate information. Verify important
              financial data independently.
            </p>
          </div>
        </div>
      </div>

      {/* ─── RIGHT: SaaS Sidebar (Desktop) ─── */}
      <aside
        className={`hidden shrink-0 border-l border-slate-200/60 bg-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:flex lg:flex-col ${
          sidebarCollapsed ? "w-[72px]" : "w-[280px]"
        }`}
      >
        <SaasSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          recentChats={recentChats}
          user={user}
          onSignOut={signOut}
          onNewChat={handleNewChat}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          />
          <aside className="absolute right-0 top-0 h-full w-[300px] border-l border-slate-200 bg-white shadow-2xl">
            <SaasSidebar
              collapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
              activeSection={activeSection}
              onSectionChange={(id) => {
                setActiveSection(id);
                setMobileSidebarOpen(false);
              }}
              recentChats={recentChats}
              user={user}
              onSignOut={signOut}
              onNewChat={() => {
                handleNewChat();
                setMobileSidebarOpen(false);
              }}
              isMobile
            />
          </aside>
        </div>
      )}
    </div>
  );
}

/* ─── SaaS Sidebar ─── */

function SaasSidebar({
  collapsed,
  onToggleCollapse,
  activeSection,
  onSectionChange,
  recentChats,
  user,
  onSignOut,
  onNewChat,
  isMobile = false,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeSection: string;
  onSectionChange: (id: string) => void;
  recentChats: { id: string; text: string; timestamp: number }[];
  user: { name: string | null; email: string; avatarUrl: string | null } | null;
  onSignOut: () => void;
  onNewChat: () => void;
  isMobile?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={`flex items-center border-b border-slate-100 ${
          collapsed ? "justify-center px-2 py-3.5" : "justify-between px-5 py-3.5"
        }`}
      >
        {collapsed ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-sm">
            <Zap size={15} className="text-white" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-sm">
                <Zap size={15} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Crux AI</h1>
                <p className="text-[10px] font-semibold tracking-wide text-slate-400">
                  FINANCIAL SUITE
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title={isMobile ? "Close" : "Collapse sidebar"}
            >
              {isMobile ? <X size={14} /> : <ChevronsRight size={14} />}
            </button>
          </>
        )}
      </div>

      {/* New Chat Button */}
      <div className={`${collapsed ? "px-2 py-3" : "px-4 py-3"}`}>
        <button
          type="button"
          onClick={onNewChat}
          className={`flex items-center justify-center gap-2 rounded-xl border border-slate-200 font-semibold transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:scale-[0.98] ${
            collapsed
              ? "h-10 w-full text-slate-600"
              : "h-10 w-full px-3 text-xs text-slate-700"
          }`}
        >
          <Plus size={15} className="shrink-0" />
          {!collapsed && <span>New Analysis</span>}
        </button>
      </div>

      {/* Workspace Sections */}
      <div className={`${collapsed ? "px-2" : "px-4"}`}>
        {!collapsed && (
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
        )}
        <nav className="space-y-1">
          {WORKSPACE_SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            const Icon = section.icon;

            if (collapsed) {
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  title={section.label}
                  className={`flex h-10 w-full items-center justify-center rounded-xl border-l-[3px] transition-all ${
                    isActive
                      ? `${section.accent.active}`
                      : "border-l-transparent hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isActive
                        ? section.accent.iconBg
                        : "text-slate-500"
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                </button>
              );
            }

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={`flex w-full items-center gap-3 rounded-xl border-l-[3px] px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? `${section.accent.active}`
                    : "border-l-transparent hover:bg-slate-50"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isActive
                      ? section.accent.iconBg
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[13px] font-semibold ${
                      isActive ? "text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {section.label}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-400">
                    {section.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Recent Chats */}
      {!collapsed && recentChats.length > 0 && (
        <div className="mt-5 flex-1 overflow-y-auto px-4">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Recent
          </p>
          <div className="space-y-0.5">
            {recentChats.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-50"
              >
                <Clock size={13} className="shrink-0 text-slate-400" />
                <p className="truncate text-xs text-slate-600">{chat.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {collapsed && <div className="flex-1" />}
      {!collapsed && recentChats.length === 0 && <div className="flex-1" />}

      {/* Bottom: Settings + Profile */}
      <div
        className={`border-t border-slate-100 ${
          collapsed ? "px-2 py-3" : "px-4 py-3"
        }`}
      >
        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="mb-2 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="Expand sidebar"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        )}

        {!collapsed && (
          <button
            type="button"
            className="mb-2 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Settings size={15} className="shrink-0 text-slate-400" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        )}

        {/* User Profile */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-blue-500 text-[11px] font-bold text-white shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-blue-500 text-[11px] font-bold text-white shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {user?.email || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-red-500"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Version badge */}
        {!collapsed && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              PRO
            </span>
            <span className="text-[10px] text-slate-400">v1.0.0</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Shared Sub-components ─── */

function ToolPill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex h-7 items-center gap-1.5 rounded-lg border border-transparent px-2 text-[11px] font-medium text-slate-500 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700"
    >
      <Icon size={13} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function WelcomeView({
  onSuggestionClick,
  isAuthenticated,
}: {
  onSuggestionClick: (s: string) => void;
  isAuthenticated: boolean;
}) {
  return (
    <div className="flex h-full items-center justify-center px-4 lg:px-6">
      <div className="w-full max-w-2xl text-center welcome-appear">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-xl shadow-slate-900/20">
          <MessageSquare size={28} className="text-white" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
          What do you want to analyze?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
          Ask about valuations, risk premiums, market trends, or any financial
          analysis. Our multi-agent pipeline will research and synthesize an
          answer for you.
        </p>

        {isAuthenticated && (
          <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestionClick(s)}
                className="group/sug flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-all hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/50"
              >
                <Sparkles
                  size={14}
                  className="shrink-0 text-slate-400 transition-colors group-hover/sug:text-teal-500"
                />
                <span className="text-xs font-medium leading-snug text-slate-600 group-hover/sug:text-slate-800">
                  {s}
                </span>
              </button>
            ))}
          </div>
        )}

        {!isAuthenticated && (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5">
            <p className="text-xs font-medium text-amber-800">
              Please sign in to start using the valuation agent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function UserBubble({
  message,
  userName,
}: {
  message: ChatMessage;
  userName?: string | null;
}) {
  return (
    <div className="flex items-start justify-end gap-3 msg-appear">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-slate-900 px-5 py-3.5 text-sm leading-relaxed text-white shadow-sm">
        {message.content}
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-[11px] font-bold text-white shadow-sm">
        {userName?.charAt(0)?.toUpperCase() || "U"}
      </div>
    </div>
  );
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex items-start gap-3 msg-appear">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 shadow-sm">
        <BotMessageSquare size={14} className="text-white" />
      </div>
      <div className="max-w-[85%] min-w-0 rounded-2xl rounded-tl-md border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
        <div className="prose-agent">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
