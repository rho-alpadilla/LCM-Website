import { describe, expect, it } from "vitest";

import {
  redactPublicLocation,
  redactPublicScheduleLinks,
} from "./public-repository";

describe("redactPublicLocation", () => {
  it("returns an exact public location", () => {
    expect(
      redactPublicLocation("public_exact", "Main Hall", "123 Church Road"),
    ).toEqual({
      label: "Main Hall",
      address: "123 Church Road",
      access: "exact",
    });
  });

  it("removes the address from an area-only location", () => {
    expect(
      redactPublicLocation("public_area", "Baguio City", "Private house 42"),
    ).toEqual({
      label: "Baguio City",
      address: null,
      access: "area_only",
    });
  });

  it("removes every stored location field from protected locations", () => {
    expect(
      redactPublicLocation("contact_required", "Secret room", "Secret address"),
    ).toEqual({
      label: "Contact the church for the location",
      address: null,
      access: "contact_required",
    });
    expect(
      redactPublicLocation("staff_only", "Secret room", "Secret address"),
    ).toEqual({
      label: "Private ministry location",
      address: null,
      access: "staff_only",
    });
  });
});

describe("redactPublicScheduleLinks", () => {
  it("removes registration URLs when visitors must request the location", () => {
    expect(
      redactPublicScheduleLinks(
        "contact_required",
        "church@example.com",
        "+63 900 000 0000",
        "https://example.com/private-registration",
      ),
    ).toEqual({
      contactEmail: "church@example.com",
      contactPhone: "+63 900 000 0000",
      registrationUrl: null,
    });
  });

  it("removes every contact and link field from staff-only activities", () => {
    expect(
      redactPublicScheduleLinks(
        "staff_only",
        "private@example.com",
        "+63 900 000 0000",
        "https://example.com/private-registration",
      ),
    ).toEqual({
      contactEmail: null,
      contactPhone: null,
      registrationUrl: null,
    });
  });
});
