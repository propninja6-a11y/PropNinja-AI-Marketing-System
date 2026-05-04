"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson } from "../../lib/api/client";
import { canRunSimulation } from "../../lib/auth/permissions";
import { useAuth } from "../../hooks/useAuth";
import { useClientRouteGuard } from "../../hooks/useClientRouteGuard";
import Link from "next/link";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [conversion, setConversion] = useState(null);
  const [error, setError] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const { logout, role } = useAuth();
  const runSimulation = async () => {
    setSimLoading(true);
    try {
      await apiJson("/api/workflows/simulate", {
        method: "POST",
        body: JSON.stringify({
          scenario: "high_load",
          lead: { name: "Admin Test", phone: "9999999999", budget: 15000000 }
        })
      });
      alert("Simulation triggered");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  };

  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/dashboard");

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, conversionRes] = await Promise.all([
          apiJson("/api/metrics/summary"),
          apiJson("/api/metrics/conversion")
        ]);
        setSummary(summaryRes);
        setConversion(conversionRes);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed loading dashboard");
      }
    }
    load();
  }, []);

  if (!isAuthReady || !isAuthenticated) {
    return <div className="m-6 h-40 animate-pulse rounded-xl bg-gray-200" />;
  }

  if (!summary || !conversion) {
    if (error) return <div className="p-6 text-red-500">{error}</div>;
    return <div className="m-6 h-40 animate-pulse rounded-xl bg-gray-200" />;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          className="rounded border px-3 py-2 text-sm"
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded border p-3">
          <div className="text-xs text-gray-500">Leads</div>
          <div className="text-2xl font-semibold">{summary.leads ?? 0}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-xs text-gray-500">Calls</div>
          <div className="text-2xl font-semibold">{summary.calls ?? 0}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-xs text-gray-500">WhatsApp</div>
          <div className="text-2xl font-semibold">{summary.whatsapp ?? 0}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Link className="rounded border bg-white p-3 text-sm hover:bg-gray-50" href="/leads">
          Manage Leads
        </Link>
        <Link className="rounded border bg-white p-3 text-sm hover:bg-gray-50" href="/uploads">
          Manage Uploads
        </Link>
        <Link className="rounded border bg-white p-3 text-sm hover:bg-gray-50" href="/campaigns">
          Manage Campaigns
        </Link>
        <Link className="rounded border bg-white p-3 text-sm hover:bg-gray-50" href="/settings">
          System Settings
        </Link>
      </div>
      <pre className="overflow-auto rounded border bg-gray-50 p-3 text-xs">
        {JSON.stringify(conversion, null, 2)}
      </pre>
      {canRunSimulation(role) ? (
        <button
          className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
          disabled={simLoading}
          onClick={runSimulation}
        >
          {simLoading ? "Running..." : "Run Simulation"}
        </button>
      ) : null}
    </div>
  );
}
