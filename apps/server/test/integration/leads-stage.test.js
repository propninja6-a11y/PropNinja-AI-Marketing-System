import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { env } from "../../src/shared/env.js";

const listMock = vi.fn();
const createMock = vi.fn();
const updateStageMock = vi.fn();

vi.mock("../../src/application/services/leadService.js", () => ({
  leadService: {
    list: listMock,
    create: createMock,
    updateStage: updateStageMock
  }
}));

describe("lead stage update", () => {
  it("updates stage for authenticated sales user", async () => {
    updateStageMock.mockResolvedValueOnce({ id: "lead-1", name: "Lead", stage: "INTERESTED" });
    const token = jwt.sign({ sub: "sales-1", role: "Sales" }, env.JWT_SECRET);
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();

    const response = await request(app)
      .patch("/api/leads/lead-1/stage")
      .set("Authorization", `Bearer ${token}`)
      .send({ stage: "INTERESTED" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.stage).toBe("INTERESTED");
  }, 10000);

  it("validates stage payload", async () => {
    const token = jwt.sign({ sub: "sales-1", role: "Sales" }, env.JWT_SECRET);
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();

    const response = await request(app)
      .patch("/api/leads/lead-1/stage")
      .set("Authorization", `Bearer ${token}`)
      .send({ stage: "UNKNOWN" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  }, 10000);
});
