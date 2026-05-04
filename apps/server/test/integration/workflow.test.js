import { describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const callMock = vi.fn();
const welcomeMock = vi.fn();

vi.mock("../../src/infrastructure/db/postgres.js", () => ({
  pool: { query: queryMock }
}));

vi.mock("../../src/application/services/callService.js", () => ({
  callService: { startCall: callMock }
}));

vi.mock("../../src/application/services/whatsappService.js", () => ({
  whatsappService: {
    sendWelcome: welcomeMock,
    sendFollowUp: vi.fn()
  }
}));

describe("workflow engine", () => {
  it("runs whatsapp then conditional call for hot lead", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          steps: [
            { type: "whatsapp", template: "intro" },
            { type: "condition", check: "lead_score > 80" },
            { type: "call" }
          ]
        }
      ]
    });

    const { runWorkflow } = await import("../../src/application/workflowEngine.js");
    await runWorkflow("LEAD_CREATED", { leadId: "lead1", phone: "99999", leadScore: 90 });

    expect(welcomeMock).toHaveBeenCalledTimes(1);
    expect(callMock).toHaveBeenCalledTimes(1);
  });
});
