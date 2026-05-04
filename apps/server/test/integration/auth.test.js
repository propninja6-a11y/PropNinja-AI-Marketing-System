import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../src/shared/env.js";

const queryMock = vi.fn();
const loginMock = vi.fn();

vi.mock("../../src/infrastructure/db/postgres.js", () => ({
  pool: { query: queryMock }
}));

vi.mock("../../src/application/services/authService.js", () => ({
  authService: {
    login: loginMock,
    refresh: vi.fn()
  }
}));

vi.mock("../../src/application/services/campaignService.js", () => ({
  campaignService: {
    list: vi.fn(async () => []),
    create: vi.fn(async () => ({}))
  }
}));

vi.mock("../../src/infrastructure/queue/queue.js", () => ({
  workflowQueue: { add: vi.fn() }
}));

describe("auth and protected routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in successfully", async () => {
    loginMock.mockResolvedValueOnce({
      token: "access",
      refreshToken: "refresh",
      role: "Admin",
      email: "admin@propninja.ai"
    });
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();

    const response = await request(app).post("/api/auth/login").send({
      email: "admin@propninja.ai",
      password: "password123"
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBe("access");
  });

  it("blocks protected routes without token", async () => {
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();

    const response = await request(app).get("/api/campaigns");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("allows protected routes with valid token", async () => {
    const token = jwt.sign({ sub: "1", role: "Admin" }, env.JWT_SECRET);
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();

    const response = await request(app)
      .get("/api/campaigns")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
