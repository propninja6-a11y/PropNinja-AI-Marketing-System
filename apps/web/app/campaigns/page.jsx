"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiJson } from "../../lib/api/client";
import { useClientRouteGuard } from "../../hooks/useClientRouteGuard";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [compare, setCompare] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/campaigns");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [compareData, campaignData] = await Promise.all([
          apiJson("/api/campaigns/compare"),
          apiJson("/api/campaigns")
        ]);
        setCompare(compareData || []);
        setCampaigns(campaignData || []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load campaigns");
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <div className="space-x-2">
          <Link className="rounded border px-3 py-2 text-sm" href="/campaigns/performance">
            Performance
          </Link>
          <Link className="rounded bg-indigo-600 px-3 py-2 text-sm text-white" href="/campaigns/builder">
            Campaign Builder
          </Link>
        </div>
      </div>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">Campaign List</h2>
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <div>
                <div className="font-medium">{campaign.name}</div>
                <div className="text-xs text-gray-500">{campaign.channel}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded border p-1 text-xs"
                  defaultValue={campaign.status}
                  onChange={async (e) => {
                    try {
                      await apiJson(`/api/campaigns/${campaign.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: e.target.value })
                      });
                    } catch (err) {
                      alert(err instanceof ApiError ? err.message : "Update failed");
                    }
                  }}
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                </select>
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={async () => {
                    try {
                      await apiJson(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
                      setCampaigns((current) => current.filter((c) => c.id !== campaign.id));
                    } catch (err) {
                      alert(err instanceof ApiError ? err.message : "Delete failed");
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">Conversion Comparison</h2>
        <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs">{JSON.stringify(compare, null, 2)}</pre>
      </div>
    </div>
  );
}
