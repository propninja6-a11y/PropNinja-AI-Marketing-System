"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson } from "../../../lib/api/client";
import { useClientRouteGuard } from "../../../hooks/useClientRouteGuard";

export default function CampaignDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/campaigns/performance");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const payload = await apiJson("/api/campaigns/performance");
        setData(payload || []);
        setError("");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load campaign performance");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!isAuthReady || !isAuthenticated || loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-gray-200" />;
  }
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Campaign Performance</h1>
      <div className="mt-4">
        {data.map((c) => (
          <div key={c.campaign} className="my-2 rounded border p-4">
            <h2 className="text-lg font-semibold">{c.campaign}</h2>
            <p>Leads: {c.leads}</p>
            <p>Calls: {c.calls}</p>
            <p>Interested: {c.interested}</p>
            <p>Visits: {c.visits}</p>
            <p>Closures: {c.closures}</p>
            <p>Revenue: ₹{c.revenue}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
