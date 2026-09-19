import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VisitorInquiryForm } from "@/frontend/components/public/visitor-inquiry-form";

vi.mock("next/script", () => ({ default: () => null }));
afterEach(cleanup);

describe("VisitorInquiryForm", () => {
  it("collects explicit consent and accessible contact fields", () => {
    render(
      <VisitorInquiryForm inquiryType="contact" siteKey="synthetic-site-key" />,
    );
    expect(screen.getByLabelText("Name")).toBeRequired();
    expect(
      screen.getByRole("textbox", { name: /How can we help/ }),
    ).toBeRequired();
    expect(screen.getByLabelText(/I consent to the church/)).toBeRequired();
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  it("shows ministry choices without duplicating a second form implementation", () => {
    render(
      <VisitorInquiryForm
        inquiryType="ministry_interest"
        ministries={[{ id: "synthetic-ministry", title: "Synthetic Ministry" }]}
        siteKey="synthetic-site-key"
      />,
    );
    expect(screen.getByLabelText(/Ministry you are interested in/)).toHaveValue(
      "",
    );
    expect(
      screen.getByRole("option", { name: "Synthetic Ministry" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Anything you would like/)).not.toBeRequired();
  });

  it("clearly disables public submission until Turnstile is configured", () => {
    render(<VisitorInquiryForm inquiryType="contact" siteKey={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("Turnstile setup");
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });
});
