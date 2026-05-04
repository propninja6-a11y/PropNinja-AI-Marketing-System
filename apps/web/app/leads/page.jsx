"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, apiJson } from "../../lib/api/client";
import { useClientRouteGuard } from "../../hooks/useClientRouteGuard";

const STAGES = ["NEW", "CONTACTED", "INTERESTED", "SITE_VISIT", "CLOSED", "LOST"];

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/leads");

  const loadLeads = async () => {
    try {
      setLoading(true);
      const payload = await apiJson("/api/leads");
      setLeads(Array.isArray(payload) ? payload : []);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const grouped = useMemo(() => {
    return STAGES.reduce((acc, stage) => {
      acc[stage] = leads.filter((lead) => (lead.stage || "NEW") === stage);
      return acc;
    }, {});
  }, [leads]);

  const updateStage = async (leadId, nextStage) => {
    const previous = leads;
    setLeads((current) =>
      current.map((lead) => (lead.id === leadId ? { ...lead, stage: nextStage } : lead))
    );
    try {
      await apiJson(`/api/leads/${leadId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage: nextStage })
      });
    } catch (err) {
      setLeads(previous);
      alert(err instanceof ApiError ? err.message : "Stage update failed");
    }
  };

  if (!isAuthReady || !isAuthenticated || loading) {
    return <div className="m-6 h-40 animate-pulse rounded-xl bg-gray-200" />;
  }
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Leads Pipeline</h1>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((stage) => (
          <div key={stage} className="rounded-xl border bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{stage}</h2>
              <span className="rounded bg-white px-2 py-0.5 text-xs">{grouped[stage]?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(grouped[stage] || []).map((lead) => (
                <div key={lead.id} className="rounded-lg bg-white p-2 text-sm shadow-sm">
                  <div className="font-medium">{lead.name}</div>
                  <div className="text-xs text-gray-500">{lead.phone}</div>
                  <select
                    className="mt-2 w-full rounded border p-1 text-xs"
                    value={lead.stage || "NEW"}
                    onChange={(e) => updateStage(lead.id, e.target.value)}
                  >
                    {STAGES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {(grouped[stage] || []).length === 0 ? (
                <div className="rounded border border-dashed p-2 text-xs text-gray-400">No leads here</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
