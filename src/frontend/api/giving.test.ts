import { afterEach, describe, expect, it, vi } from "vitest";
import { startGivingCheckout } from "./giving";

afterEach(() => vi.unstubAllGlobals());

describe("giving browser requests", () => {
  it("preserves the amount, purpose, token and idempotency key", async () => {
    const request = vi.fn().mockResolvedValue(
      Response.json({
        checkoutUrl: "https://checkout.example.test/synthetic",
      }),
    );
    vi.stubGlobal("fetch", request);
    const form = new FormData();
    form.set("amount", "100.00");
    form.set("purpose", "general_church");
    form.set("cf-turnstile-response", "synthetic-token");
    expect(await startGivingCheckout(form, "synthetic-key")).toBe(
      "https://checkout.example.test/synthetic",
    );
    expect(request).toHaveBeenCalledWith(
      "/api/giving/checkout",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      amount: "100.00",
      purpose: "general_church",
      idempotencyKey: "synthetic-key",
      turnstileToken: "synthetic-token",
    });
  });

  it.each([200, 503])(
    "does not return a checkout URL for an incomplete response (%s)",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(Response.json({}, { status })),
      );
      await expect(
        startGivingCheckout(new FormData(), "synthetic-key"),
      ).rejects.toThrow("The secure checkout could not be started.");
    },
  );
});
