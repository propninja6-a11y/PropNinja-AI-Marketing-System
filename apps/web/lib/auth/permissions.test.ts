import { describe, expect, it } from "vitest";
import { canAccessRoute, canManageCampaigns, canRunSimulation } from "./permissions";

describe("permissions", () => {
  it("allows public pages regardless of role", () => {
    expect(canAccessRoute(null, "/login")).toBe(true);
    expect(canAccessRoute("Sales", "/health")).toBe(true);
  });

  it("enforces protected routes", () => {
    expect(canAccessRoute(null, "/dashboard")).toBe(false);
    expect(canAccessRoute("Sales", "/uploads")).toBe(true);
  });

  it("supports role helpers", () => {
    expect(canRunSimulation("Admin")).toBe(true);
    expect(canRunSimulation("Manager")).toBe(false);
    expect(canManageCampaigns("Manager")).toBe(true);
  });
});
