import { afterEach, describe, expect, it, vi } from "vitest";
import { revealPrayerContact, submitPrayerRequest } from "./prayer";

afterEach(() => vi.unstubAllGlobals());

describe("prayer browser requests", () => {
  it("preserves submission fields and consent booleans", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(Response.json({ message: "Synthetic acceptance" }));
    vi.stubGlobal("fetch", request);
    const form = new FormData();
    form.set("requestText", "Synthetic prayer test");
    form.set("privacyScope", "pastoral_only");
    form.set("privacyAcknowledged", "on");
    form.set("cf-turnstile-response", "synthetic-token");
    expect(await submitPrayerRequest(form)).toBe("Synthetic acceptance");
    expect(request).toHaveBeenCalledWith(
      "/api/prayer",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({
      requestText: "Synthetic prayer test",
      privacyScope: "pastoral_only",
      privacyAcknowledged: true,
      followUpConsent: false,
      turnstileToken: "synthetic-token",
    });
  });

  it("propagates a rejected submission without reporting success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ message: "Please retry later." }, { status: 429 }),
        ),
    );
    await expect(submitPrayerRequest(new FormData())).rejects.toThrow(
      "Please retry later.",
    );
  });

  it("reveals contact only with an uncached, explicit request", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ contact: null }));
    vi.stubGlobal("fetch", request);
    expect(await revealPrayerContact("synthetic-id")).toBeNull();
    expect(request).toHaveBeenCalledExactlyOnceWith(
      "/api/admin/prayer/synthetic-id/contact",
      { cache: "no-store" },
    );
  });

  it("does not expose the body of a denied contact response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { internal: "synthetic-private-detail" },
            { status: 403 },
          ),
        ),
    );
    await expect(revealPrayerContact("synthetic-id")).rejects.toThrow(
      "Contact details could not be revealed.",
    );
  });
});
