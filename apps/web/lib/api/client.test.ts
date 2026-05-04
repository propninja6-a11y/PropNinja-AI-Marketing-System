import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiJson } from "./client";
import { clearSession, getAccessToken, setSession } from "../auth/token-store";

describe("apiJson refresh queueing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearSession();
    setSession({
      accessToken: "expired-token",
      refreshToken: "refresh-token",
      role: "Admin",
      email: "admin@propninja.ai"
    });
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
  });

  it("runs a single refresh for concurrent 401 responses", async () => {
    let protectedCallCount = 0;
    let refreshCallCount = 0;

    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/auth/refresh")) {
        refreshCallCount += 1;
        return new Response(
          JSON.stringify({ success: true, data: { token: "new-token" }, error: null }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      protectedCallCount += 1;
      if (protectedCallCount <= 2) {
        return new Response(
          JSON.stringify({ success: false, data: {}, error: { message: "Invalid or expired token" } }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ success: true, data: { ok: true }, error: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }));

    const [a, b] = await Promise.all([apiJson("/api/metrics/summary"), apiJson("/api/metrics/conversion")]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refreshCallCount).toBe(1);
    expect(getAccessToken()).toBe("new-token");
  });

  it("fails queued requests when refresh fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/api/auth/refresh")) {
        return new Response(JSON.stringify({ success: false, data: {}, error: { message: "Refresh failed" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ success: false, data: {}, error: { message: "Unauthorized" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }));

    const result = await Promise.allSettled([apiJson("/api/uploads"), apiJson("/api/campaigns/performance")]);
    expect(result[0].status).toBe("rejected");
    expect(result[1].status).toBe("rejected");
    expect(getAccessToken()).toBeNull();
  });
});
