"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson } from "../../lib/api/client";
import { useClientRouteGuard } from "../../hooks/useClientRouteGuard";

export default function AssignmentPage() {
  const [conversion, setConversion] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/assignment");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await apiJson("/api/metrics/conversion");
        setConversion(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load assignment analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!isAuthReady || !isAuthenticated || loading) {
    return <div className="m-6 h-40 animate-pulse rounded-xl bg-gray-200" />;
  }
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Assignment Analytics</h1>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Strategy & Conversion Snapshot</h2>
        <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs">{JSON.stringify(conversion, null, 2)}</pre>
      </div>
    </div>
  );
}
