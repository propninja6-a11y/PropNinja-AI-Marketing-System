"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CloudUpload,
  Loader2,
  Percent,
  RefreshCw,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  TrendingUp,
  UploadCloud
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/uploads/PageHeader";
import { StatCard } from "@/components/uploads/StatCard";
import { UploadCard, type UploadRow } from "@/components/uploads/UploadCard";
import { FailureCard, type FailureRow } from "@/components/uploads/FailureCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiJson } from "@/lib/api/client";
import { loadSessionFromStorage, getAccessToken } from "@/lib/auth/token-store";
import { useClientRouteGuard } from "@/hooks/useClientRouteGuard";
import { useAuth } from "@/hooks/useAuth";

export default function UploadDashboardPage() {
  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/uploads");
  const { login } = useAuth();

  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [failures, setFailures] = useState<FailureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState("calling");
  const [tokenInput, setTokenInput] = useState("");
  const [retryAllPending, setRetryAllPending] = useState(false);

  useEffect(() => {
    loadSessionFromStorage();
    const existing = getAccessToken();
    if (existing) setTokenInput(existing);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [up, fail] = await Promise.all([
        apiJson<UploadRow[]>("/api/uploads"),
        apiJson<FailureRow[]>("/api/uploads/failed")
      ]);
      setUploads(Array.isArray(up) ? up : []);
      setFailures(Array.isArray(fail) ? fail : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load upload dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) return;
    void load();
  }, [isAuthReady, isAuthenticated, load]);

  const totals = useMemo(() => {
    return uploads.reduce(
      (acc, u) => {
        acc.totalRows += Number(u.total_rows || 0);
        acc.successRows += Number(u.success_rows || 0);
        acc.failedRows += Number(u.failed_rows || 0);
        return acc;
      },
      { totalRows: 0, successRows: 0, failedRows: 0 }
    );
  }, [uploads]);

  const successRate =
    totals.totalRows > 0 ? Math.round((totals.successRows / totals.totalRows) * 1000) / 10 : 0;

  const saveToken = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      toast.error("Paste an admin token first");
      return;
    }
    login({
      accessToken: trimmed,
      refreshToken: trimmed,
      role: "Admin"
    });
    toast.success("Token saved");
    void load();
  };

  const retryAllFailed = async () => {
    setRetryAllPending(true);
    try {
      const res = await apiJson<{ retried?: number }>("/api/uploads/retry-failed", { method: "POST" });
      toast.success(`Retried ${res?.retried ?? 0} failed row(s)`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Bulk retry failed");
    } finally {
      setRetryAllPending(false);
    }
  };

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiJson(`/api/uploads/${type}`, {
        method: "POST",
        body: formData
      });
      toast.success("Upload queued successfully");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!isAuthReady || !isAuthenticated) {
    return (
      <div className="min-h-[60vh] space-y-6 bg-[#F8FAFC] p-6 lg:p-10">
        <Skeleton className="h-10 w-2/3 max-w-md" />
        <Skeleton className="h-24 w-full max-w-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 pt-6 lg:pb-24 lg:pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="PropNinja AI Marketing System"
          subtitle="Bulk Upload & Retry Management"
          actions={
            <>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 rounded-xl border-slate-200"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl shadow-md"
                onClick={() => void retryAllFailed()}
                disabled={retryAllPending || failures.length === 0}
              >
                <RotateCcw className={`h-4 w-4 ${retryAllPending ? "animate-spin" : ""}`} />
                Retry Failed
              </Button>
            </>
          }
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="border-slate-100/90 shadow-lg lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-indigo-600" />
                Admin Token
              </CardTitle>
              <CardDescription>Paste a bearer JWT to authenticate API requests for this session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="password"
                autoComplete="off"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <Button className="w-full" onClick={saveToken}>
                Save Token
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/40 shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CloudUpload className="h-5 w-5 text-indigo-600" />
                Upload spreadsheet
              </CardTitle>
              <CardDescription>Drag and drop an .xlsx file, or browse. Queued jobs appear below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="calling">Calling</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <label
                className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-white/80 px-4 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/50 ${uploading ? "pointer-events-none opacity-60" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void uploadFile(f);
                }}
              >
                <UploadCloud className="mb-2 h-10 w-10 text-indigo-500" />
                <span className="text-sm font-semibold text-slate-800">Drop file here</span>
                <span className="mt-1 text-xs text-slate-500">.xlsx, .xls</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="mt-4 block w-full max-w-xs text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700"
                  disabled={uploading}
                  onChange={(e) => void uploadFile(e.target.files?.[0])}
                />
                {uploading ? (
                  <span className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </span>
                ) : null}
              </label>
            </CardContent>
          </Card>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Performance overview
          </h2>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Uploads" value={uploads.length} icon={UploadCloud} gradient="indigo" />
              <StatCard label="Total Leads Processed" value={totals.successRows} icon={TrendingUp} gradient="blue" />
              <StatCard label="Failed Rows" value={totals.failedRows} icon={Skull} gradient="violet" />
              <StatCard label="Success Rate %" value={`${successRate}%`} icon={Percent} gradient="emerald" />
            </div>
          )}
        </section>

        <section className="mt-14">
          <h2 className="mb-6 text-lg font-semibold text-slate-900">Uploads</h2>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : uploads.length === 0 ? (
            <Card className="border-slate-100 py-20 text-center shadow-lg">
              <CardContent className="flex flex-col items-center justify-center gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 p-5 text-indigo-700">
                  <UploadCloud className="h-10 w-10" />
                </div>
                <p className="text-lg font-semibold text-slate-800">No uploads yet</p>
                <p className="max-w-md text-sm text-slate-500">Drop a spreadsheet above to start processing leads.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {uploads.map((u) => (
                <UploadCard key={u.id} upload={u} />
              ))}
            </div>
          )}
        </section>

        <section id="failures" className="mt-16 scroll-mt-24">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Failed rows</h2>
            <Button
              variant="destructive"
              size="lg"
              className="w-full rounded-xl shadow-lg sm:w-auto"
              onClick={() => void retryAllFailed()}
              disabled={retryAllPending || failures.length === 0}
            >
              <RotateCcw className={`h-4 w-4 ${retryAllPending ? "animate-spin" : ""}`} />
              Retry All
            </Button>
          </div>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : failures.length === 0 ? (
            <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white py-16 text-center shadow-lg">
              <CardContent>
                <p className="text-lg font-semibold text-emerald-800">No failures 🎉</p>
                <p className="mt-2 text-sm text-emerald-700/80">Everything in your recent uploads looks healthy.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {failures.map((row) => (
                <FailureCard key={row.id} row={row} onRetried={load} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
