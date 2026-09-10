import { expect, test } from "@playwright/test";

test("shows the confirmed church identity", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Lifechangers Ministry Incorporated" }),
  ).toBeVisible();
  await expect(page.getByText("Development foundation")).toBeVisible();
});

test("keeps public visitors separate from staff authentication", async ({
  page,
}) => {
  await page.goto("/admin/login");

  await expect(
    page.getByRole("heading", { name: "Secure sign-in" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Staff authentication is handled by Cloudflare Access/),
  ).toBeVisible();
  await expect(page.getByText(/No password fallback is enabled/)).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
