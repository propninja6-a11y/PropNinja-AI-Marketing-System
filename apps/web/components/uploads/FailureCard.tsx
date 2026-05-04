"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { ApiError, apiJson } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export type FailureRow = {
  id: string;
  type?: string;
  campaign?: string | null;
  error?: string | null;
  retry_count?: number;
  status?: string;
  row_data?: unknown;
};

type FailureCardProps = {
  row: FailureRow;
  onRetried: () => void | Promise<void>;
};

export function FailureCard({ row, onRetried }: FailureCardProps) {
  const [pending, setPending] = useState(false);

  const retry = async () => {
    setPending(true);
    try {
      await apiJson(`/api/uploads/retry-failed/${row.id}`, { method: "POST" });
      toast.success("Row queued for retry");
      await onRetried();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Retry failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="group border-red-100/80 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-red-100/50">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Row ID</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{row.id}</p>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            Retries: {row.retry_count ?? 0}
          </Badge>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Campaign</p>
          <p className="mt-0.5 text-sm font-medium text-slate-800">{row.campaign || "—"}</p>
          {row.type ? <p className="mt-1 text-xs capitalize text-slate-500">Type: {row.type}</p> : null}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Error</p>
          <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium leading-relaxed text-red-600">
            {row.error || "Unknown error"}
          </p>
        </div>
        <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={retry} disabled={pending}>
          <RotateCcw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
          {pending ? "Retrying…" : "Retry"}
        </Button>
      </CardContent>
    </Card>
  );
}
