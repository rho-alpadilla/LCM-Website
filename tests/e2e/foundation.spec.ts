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
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(
    page.getByText("Public visitors do not need an account"),
  ).toBeVisible();
  await expect(page.getByText(/sign up/i)).toHaveCount(0);
});
