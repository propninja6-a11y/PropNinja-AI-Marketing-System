"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson } from "../../lib/api/client";
import { useClientRouteGuard } from "../../hooks/useClientRouteGuard";

export default function NotificationsPage() {
  const [rows, setRows] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("info");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/notifications");

  const loadNotifications = async () => {
    const data = await apiJson("/api/admin/notifications");
    setRows(data || []);
  };

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        await loadNotifications();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load notifications");
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
      <h1 className="text-2xl font-bold">Notifications</h1>
      <div className="grid gap-2 rounded border bg-white p-4 md:grid-cols-4">
        <input
          className="rounded border p-2 text-sm"
          placeholder="Alert title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="rounded border p-2 text-sm md:col-span-2"
          placeholder="Alert message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <select className="rounded border p-2 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
        </select>
        <button
          className="rounded bg-indigo-600 px-3 py-2 text-sm text-white"
          onClick={async () => {
            try {
              await apiJson("/api/admin/notifications", {
                method: "POST",
                body: JSON.stringify({ type: "manual_alert", title, message, severity })
              });
              setTitle("");
              setMessage("");
              await loadNotifications();
            } catch (err) {
              alert(err instanceof ApiError ? err.message : "Failed to create alert");
            }
          }}
        >
          Create Alert
        </button>
      </div>
      <div className="rounded border bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-gray-600">Operational Alerts ({rows.length})</div>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{row.title}</div>
                <span className="text-xs text-gray-500">{row.severity}</span>
              </div>
              <div className="mt-1 text-gray-600">{row.message}</div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{row.status}</span>
                {row.status !== "acknowledged" ? (
                  <button
                    className="rounded border px-2 py-1"
                    onClick={async () => {
                      try {
                        await apiJson(`/api/admin/notifications/${row.id}/ack`, { method: "PATCH" });
                        await loadNotifications();
                      } catch (err) {
                        alert(err instanceof ApiError ? err.message : "Ack failed");
                      }
                    }}
                  >
                    Acknowledge
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
