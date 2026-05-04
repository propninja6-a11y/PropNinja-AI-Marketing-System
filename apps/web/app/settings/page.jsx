"use client";

import { useEffect, useState } from "react";
import { useClientRouteGuard } from "../../hooks/useClientRouteGuard";
import { ApiError, apiJson } from "../../lib/api/client";

export default function SettingsPage() {
  const { isAuthReady, isAuthenticated } = useClientRouteGuard("/settings");
  const [loading, setLoading] = useState(true);
  const [vapiKey, setVapiKey] = useState("");
  const [watiKey, setWatiKey] = useState("");
  const [openAiKey, setOpenAiKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await apiJson("/api/admin/settings");
        setVapiKey(data?.VAPI_API_KEY || "");
        setWatiKey(data?.WATI_API_KEY || "");
        setOpenAiKey(data?.OPENAI_API_KEY || "");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load settings");
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
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="rounded border bg-white p-4">
        <div className="mb-3 text-sm text-gray-600">
          Admin control panel for integration keys. Persist via backend settings API when available.
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border p-2"
            placeholder="Vapi API Key"
            value={vapiKey}
            onChange={(e) => setVapiKey(e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="WATI API Key"
            value={watiKey}
            onChange={(e) => setWatiKey(e.target.value)}
          />
          <input
            className="rounded border p-2 md:col-span-2"
            placeholder="OpenAI API Key"
            value={openAiKey}
            onChange={(e) => setOpenAiKey(e.target.value)}
          />
        </div>
        <button
          className="mt-3 rounded bg-indigo-600 px-4 py-2 text-white"
          onClick={async () => {
            try {
              await apiJson("/api/admin/settings", {
                method: "PUT",
                body: JSON.stringify({
                  VAPI_API_KEY: vapiKey,
                  WATI_API_KEY: watiKey,
                  OPENAI_API_KEY: openAiKey
                })
              });
              alert("Settings saved");
            } catch (err) {
              alert(err instanceof ApiError ? err.message : "Failed to save settings");
            }
          }}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
