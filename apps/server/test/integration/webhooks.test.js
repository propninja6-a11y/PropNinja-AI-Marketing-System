import crypto from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../src/shared/env.js";

const queryMock = vi.fn();
const queueAddMock = vi.fn();

vi.mock("../../src/infrastructure/db/postgres.js", () => ({
  pool: { query: queryMock }
}));

vi.mock("../../src/infrastructure/queue/queue.js", () => ({
  workflowQueue: { add: queueAddMock }
}));

const signatureFor = (payload) =>
  crypto.createHmac("sha256", env.WEBHOOK_SECRET).update(JSON.stringify(payload)).digest("hex");

describe("webhook security and idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid signature", async () => {
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();

    const response = await request(app)
      .post("/api/webhooks/vapi")
      .set("x-signature", "bad-signature")
      .send({ eventId: "evt-1", status: "completed" });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("ignores duplicate events", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: "already-processed" }] });
    const payload = { eventId: "evt-2", status: "completed", metadata: { leadId: "l1", phone: "99999" } };
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();

    const response = await request(app)
      .post("/api/webhooks/vapi")
      .set("x-signature", signatureFor(payload))
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data.duplicate).toBe(true);
    expect(queueAddMock).not.toHaveBeenCalled();
  });
});
