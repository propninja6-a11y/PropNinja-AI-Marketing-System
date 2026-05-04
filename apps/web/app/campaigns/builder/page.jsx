"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson } from "../../../lib/api/client";
import { useClientRouteGuard } from "../../../hooks/useClientRouteGuard";

export default function CampaignBuilderPage() {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("LEAD_CREATED");
  const [strategy, setStrategy] = useState("round_robin");
  const [builders, setBuilders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/campaigns/builder");

  const loadBuilders = async () => {
    try {
      setLoading(true);
      const data = await apiJson("/api/campaigns/builder");
      setBuilders(data || []);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load builders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuilders();
  }, []);

  const createBuilder = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiJson("/api/campaigns/builder", {
        method: "POST",
        body: JSON.stringify({
          name,
          trigger,
          assignment_strategy: strategy,
          steps: [{ type: "whatsapp", template: "intro" }, { type: "call" }]
        })
      });
      setName("");
      await loadBuilders();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to create builder");
    } finally {
      setSaving(false);
    }
  };

  const deleteBuilder = async (id) => {
    try {
      await apiJson(`/api/campaigns/builder/${id}`, { method: "DELETE" });
      await loadBuilders();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete builder");
    }
  };

  if (!isAuthReady || !isAuthenticated || loading) {
    return <div className="m-6 h-40 animate-pulse rounded-xl bg-gray-200" />;
  }
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Campaign Builder</h1>
      <form onSubmit={createBuilder} className="grid gap-2 rounded border bg-white p-4 md:grid-cols-4">
        <input
          className="rounded border p-2"
          placeholder="Campaign name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select className="rounded border p-2" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
          <option value="LEAD_CREATED">LEAD_CREATED</option>
          <option value="CALL_COMPLETED">CALL_COMPLETED</option>
        </select>
        <select className="rounded border p-2" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          <option value="round_robin">round_robin</option>
          <option value="least_loaded">least_loaded</option>
          <option value="territory">territory</option>
        </select>
        <button className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-60" disabled={saving}>
          {saving ? "Saving..." : "Create"}
        </button>
      </form>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Existing Builders</h2>
        <div className="space-y-2">
          {builders.map((builder) => (
            <div key={builder.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <div>
                <div className="font-medium">{builder.name}</div>
                <div className="text-xs text-gray-500">{builder.trigger_event}</div>
              </div>
              <button className="rounded border px-2 py-1 text-xs" onClick={() => deleteBuilder(builder.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
