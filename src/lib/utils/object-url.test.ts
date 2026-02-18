import { describe, expect, it, vi } from "vitest";
import { safeRevokeObjectUrl } from "@/lib/utils/object-url";

describe("safeRevokeObjectUrl", () => {
  it("does not call revoke for invalid url values", () => {
    const revoke = vi.fn();
    safeRevokeObjectUrl(undefined, revoke);
    safeRevokeObjectUrl(null, revoke);
    safeRevokeObjectUrl("   ", revoke);
    expect(revoke).not.toHaveBeenCalled();
  });

  it("calls revoke once for valid url", () => {
    const revoke = vi.fn();
    safeRevokeObjectUrl(" blob:test-url ", revoke);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:test-url");
  });
});
