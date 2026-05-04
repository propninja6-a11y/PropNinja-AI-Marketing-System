import { describe, expect, it } from "vitest";
import { resolveAuthRedirect } from "./middleware";

describe("middleware route redirects", () => {
  it("redirects protected routes to login when no session cookie", () => {
    expect(resolveAuthRedirect("/dashboard", false)).toBe("/login");
    expect(resolveAuthRedirect("/uploads/failed", false)).toBe("/login");
  });

  it("redirects login to dashboard when already authenticated", () => {
    expect(resolveAuthRedirect("/login", true)).toBe("/dashboard");
  });

  it("does not redirect for valid authenticated protected access", () => {
    expect(resolveAuthRedirect("/campaigns/performance", true)).toBeNull();
  });
});
