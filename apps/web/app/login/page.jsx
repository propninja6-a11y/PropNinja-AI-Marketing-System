"use client";

import { useEffect, useState } from "react";
import { ApiError, apiJson } from "../../lib/api/client";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, isAuthReady } = useAuth();

  useEffect(() => {
    if (isAuthReady && isAuthenticated) {
      window.location.href = "/dashboard";
    }
  }, [isAuthReady, isAuthenticated]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      login({
        accessToken: data.token,
        refreshToken: data.refreshToken,
        role: data.role,
        email: data.email
      });
      window.location.href = "/dashboard";
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "Invalid email or password. If you just seeded the DB, run: npm run db:seed:admin -w apps/server — then use admin@propninja.ai / Admin@12345"
            : err.message
        );
      } else if (err instanceof TypeError || (typeof err?.message === "string" && err.message.includes("fetch"))) {
        setError(
          `Cannot reach the API at ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}. Start the backend: npm run dev (from the repo root), then try again.`
        );
      } else {
        setError("Login failed. Check the browser console and that PostgreSQL is running.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border bg-white p-6 shadow">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-gray-500">Use your PropNinja credentials.</p>
      <form onSubmit={handleLogin} className="mt-4 space-y-3">
        <input
          className="w-full rounded border p-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
