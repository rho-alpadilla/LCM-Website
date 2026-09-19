import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrayerRequestForm } from "@/frontend/components/public/prayer/request-form";

vi.mock("next/script", () => ({ default: () => null }));
afterEach(cleanup);

describe("PrayerRequestForm", () => {
  it("exposes accessible labels and a required privacy acknowledgement", () => {
    render(<PrayerRequestForm siteKey="synthetic-site-key" />);
    expect(screen.getByLabelText("Prayer request")).toHaveAttribute(
      "maxlength",
      "5000",
    );
    expect(
      screen.getByRole("group", { name: "Who may read this request?" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/I understand who may read/)).toBeRequired();
    expect(
      screen.getByRole("button", { name: "Submit prayer request" }),
    ).toBeEnabled();
  });

  it("clearly disables submission when Turnstile is not configured", () => {
    render(<PrayerRequestForm siteKey={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("not configured");
    expect(
      screen.getByRole("button", { name: "Submit prayer request" }),
    ).toBeDisabled();
  });
});
