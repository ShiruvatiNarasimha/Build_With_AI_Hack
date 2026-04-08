"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { getValuation, type Valuation } from "@/lib/valuation-suite-client";
import { ValuationWizard } from "@/components/valuation-suite/valuation-wizard";

export default function ValuationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { accessToken, status } = useAuth();
  const router = useRouter();
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchValuation = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await getValuation(accessToken, id);
      setValuation(data);
    } catch {
      toast.error("Valuation not found.");
      router.push("/dashboard/valuation-suite");
    } finally {
      setLoading(false);
    }
  }, [accessToken, id, router]);

  useEffect(() => {
    if (status === "authenticated") fetchValuation();
    else if (status === "unauthenticated") {
      router.push("/dashboard/valuation-suite");
    }
  }, [status, fetchValuation, router]);

  if (loading || !valuation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ValuationWizard
      valuation={valuation}
      onUpdate={setValuation}
      accessToken={accessToken!}
    />
  );
}
