import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { env } from "../../src/shared/env.js";

const getAllMock = vi.fn();
const setManyMock = vi.fn();
const listNotificationsMock = vi.fn();
const createNotificationMock = vi.fn();
const ackNotificationMock = vi.fn();
const listUsersMock = vi.fn();
const updateUserMock = vi.fn();

vi.mock("../../src/application/services/adminSettingsService.js", () => ({
  adminSettingsService: {
    getAll: getAllMock,
    setMany: setManyMock
  }
}));

vi.mock("../../src/application/services/adminNotificationsService.js", () => ({
  adminNotificationsService: {
    list: listNotificationsMock,
    create: createNotificationMock,
    acknowledge: ackNotificationMock
  }
}));

vi.mock("../../src/application/services/adminUsersService.js", () => ({
  adminUsersService: {
    list: listUsersMock,
    update: updateUserMock
  }
}));

describe("admin APIs", () => {
  it("returns settings for admin", async () => {
    getAllMock.mockResolvedValueOnce({ VAPI_API_KEY: "x" });
    const token = jwt.sign({ sub: "admin-1", role: "Admin" }, env.JWT_SECRET);
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();

    const response = await request(app).get("/api/admin/settings").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.VAPI_API_KEY).toBe("x");
  }, 10000);

  it("updates and lists notifications", async () => {
    listNotificationsMock.mockResolvedValueOnce([{ id: "n1", title: "Alert", status: "open" }]);
    createNotificationMock.mockResolvedValueOnce({ id: "n2", title: "Created", status: "open" });
    const token = jwt.sign({ sub: "manager-1", role: "Manager" }, env.JWT_SECRET);
    const { createApp } = await import("../../src/interfaces/http/app.js");
    const app = createApp();

    const listResponse = await request(app)
      .get("/api/admin/notifications")
      .set("Authorization", `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);

    const createResponse = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "manual_alert", title: "Created", message: "body" });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
  }, 10000);
});
