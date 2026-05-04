"use client";

import { FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type UploadRow = {
  id: string;
  filename?: string | null;
  type?: string;
  campaign?: string | null;
  total_rows?: number;
  success_rows?: number;
  failed_rows?: number;
  status?: string;
};

function statusVariant(status: string | undefined): "success" | "warning" | "destructive" | "secondary" {
  const s = (status || "").toLowerCase();
  if (s.includes("complete") || s === "done" || s === "success") return "success";
  if (s.includes("fail") || s.includes("error")) return "destructive";
  if (s.includes("process") || s.includes("pending") || s.includes("queue")) return "warning";
  return "secondary";
}

function formatStatus(status: string | undefined) {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function UploadCard({ upload }: { upload: UploadRow }) {
  const total = Number(upload.total_rows || 0);
  const success = Number(upload.success_rows || 0);
  const failed = Number(upload.failed_rows || 0);
  const pct = total > 0 ? Math.round((success / total) * 100) : 0;
  const variant = statusVariant(upload.status);
  const processing = variant === "warning";

  return (
    <Card className="group border-slate-100/90 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-indigo-100/60">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 p-3 text-indigo-700">
            <FileSpreadsheet className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-bold text-slate-900">{upload.filename || "Untitled file"}</p>
            <p className="text-sm text-slate-500">
              Campaign: <span className="font-medium text-slate-700">{upload.campaign || "—"}</span>
              {upload.type ? (
                <>
                  {" "}
                  · <span className="capitalize">{upload.type}</span>
                </>
              ) : null}
            </p>
          </div>
          <Badge variant={variant}>{formatStatus(upload.status)}</Badge>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
            <span>Progress</span>
            <span className="tabular-nums text-slate-700">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 transition-all duration-500",
                processing && "animate-progress-stripes bg-[length:40px_100%] bg-gradient-to-r from-indigo-500 via-blue-400 to-violet-500"
              )}
              style={processing ? { width: "100%" } : { width: `${Math.min(100, Math.max(pct, total ? 4 : 0))}%` }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{total}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600/80">Success</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600">{success}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-red-500/80">Failed</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-red-500">{failed}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
