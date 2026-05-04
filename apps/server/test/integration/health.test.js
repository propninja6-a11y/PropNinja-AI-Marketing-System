import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/infrastructure/queue/queue.js", () => ({
  workflowQueue: { add: vi.fn() }
}));

describe("GET /health", () => {
  it("returns response envelope", async () => {
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.error).toBeNull();
    expect(response.body.data.service).toBe("PropNinja AI Marketing System");
  });
});
