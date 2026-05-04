"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson } from "../../lib/api/client";
import { useClientRouteGuard } from "../../hooks/useClientRouteGuard";

export default function SalesPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/sales");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await apiJson("/api/admin/users?role=Sales");
        setUsers(data || []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load sales metrics");
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
      <h1 className="text-2xl font-bold">Sales Dashboard</h1>
      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Sales Team Management</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="grid gap-2 rounded border p-2 md:grid-cols-5">
              <div className="text-sm md:col-span-2">{user.email}</div>
              <input
                className="rounded border p-1 text-sm"
                defaultValue={user.territory || ""}
                placeholder="Territory"
                onBlur={async (e) => {
                  try {
                    await apiJson(`/api/admin/users/${user.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ territory: e.target.value || null })
                    });
                  } catch (err) {
                    alert(err instanceof ApiError ? err.message : "Territory update failed");
                  }
                }}
              />
              <select
                className="rounded border p-1 text-sm"
                defaultValue={user.is_active ? "active" : "inactive"}
                onChange={async (e) => {
                  try {
                    await apiJson(`/api/admin/users/${user.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ is_active: e.target.value === "active" })
                    });
                  } catch (err) {
                    alert(err instanceof ApiError ? err.message : "Status update failed");
                  }
                }}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
              <div className="text-xs text-gray-500">{user.role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
