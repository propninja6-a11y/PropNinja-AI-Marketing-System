import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../src/shared/env.js";

const { runWorkflowSimulationMock } = vi.hoisted(() => ({
  runWorkflowSimulationMock: vi.fn()
}));

vi.mock("../../src/application/simulator/workflowSimulator.js", () => ({
  SCENARIOS: new Set([
    "wati_down",
    "vapi_delay",
    "duplicate_webhook",
    "high_load",
    "partial_failure"
  ]),
  runWorkflowSimulation: (...args) => runWorkflowSimulationMock(...args)
}));

vi.mock("../../src/infrastructure/queue/queue.js", () => ({
  workflowQueue: { add: vi.fn() }
}));

describe("POST /api/workflows/simulate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runWorkflowSimulationMock.mockResolvedValue({
      scenario: "partial_failure",
      result: { whatsapp: "simulated_ok", runId: "test-run" },
      notes: "stub"
    });
  });

  it("rejects non-Admin roles", async () => {
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();
    const token = jwt.sign({ sub: "1", role: "Sales" }, env.JWT_SECRET);
    const res = await request(app)
      .post("/api/workflows/simulate")
      .set("Authorization", `Bearer ${token}`)
      .send({
        scenario: "partial_failure",
        lead: { name: "Test User", phone: "9999999999", budget: 15000000 }
      });

    expect(res.status).toBe(403);
    expect(runWorkflowSimulationMock).not.toHaveBeenCalled();
  });

  it("runs controlled simulation for Admin", async () => {
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();
    const token = jwt.sign({ sub: "1", role: "Admin" }, env.JWT_SECRET);
    const res = await request(app)
      .post("/api/workflows/simulate")
      .set("Authorization", `Bearer ${token}`)
      .send({
        scenario: "partial_failure",
        lead: { name: "Test User", phone: "9999999999", budget: 15000000 }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.scenario).toBe("partial_failure");
    expect(runWorkflowSimulationMock).toHaveBeenCalledTimes(1);
  });
});
