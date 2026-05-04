import { describe, expect, it } from "vitest";
import { errorResponse, successResponse } from "../../src/shared/response.js";

describe("response helpers", () => {
  it("returns success envelope", () => {
    const result = successResponse({ ok: true });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ok: true });
    expect(result.error).toBeNull();
  });

  it("returns error envelope", () => {
    const result = errorResponse("bad");
    expect(result.success).toBe(false);
    expect(result.data).toEqual({});
    expect(result.error.message).toBe("bad");
  });
});
