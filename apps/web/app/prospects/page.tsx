"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson } from "../../lib/api/client";
import { useClientRouteGuard } from "../../hooks/useClientRouteGuard";

type ProspectRow = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  campaign?: string | null;
  source?: string | null;
  outreach_status?: string | null;
  promoted_lead_id?: string | null;
  promoted_at?: string | null;
  created_at?: string | null;
};

export default function ProspectsPage() {
  const [rows, setRows] = useState<ProspectRow[]>([]);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/prospects");

  const load = async () => {
    try {
      setLoading(true);
      const q = filter === "all" ? "?filter=all" : "";
      const data = await apiJson<ProspectRow[]>(`/api/prospects${q}`);
      setRows(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load prospects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  if (!isAuthReady || !isAuthenticated || loading) {
    return <div className="m-6 h-40 animate-pulse rounded-xl bg-gray-200" />;
  }
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prospects</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Contacts from uploads used for AI calling and WhatsApp outreach. When someone shows interest
            (replies on WhatsApp or qualifies on a completed call), they appear under{" "}
            <span className="font-medium">Leads</span>.
          </p>
        </div>
        <div className="flex gap-2 rounded-lg border bg-white p-1 text-sm">
          <button
            type="button"
            className={`rounded-md px-3 py-1 ${filter === "open" ? "bg-indigo-600 text-white" : "text-slate-700"}`}
            onClick={() => setFilter("open")}
          >
            In outreach
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1 ${filter === "all" ? "bg-indigo-600 text-white" : "text-slate-700"}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Lead</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No prospects in this view.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{p.campaign || "—"}</td>
                  <td className="px-4 py-3 capitalize">{p.outreach_status || "—"}</td>
                  <td className="px-4 py-3">
                    {p.promoted_lead_id ? (
                      <span className="text-emerald-700">Promoted</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
