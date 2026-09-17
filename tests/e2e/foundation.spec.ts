import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicPages = [
  { path: "/", heading: "Lifechangers Ministry Incorporated" },
  { path: "/sermons", heading: "Sermons" },
  { path: "/ministries", heading: "Ministries" },
  { path: "/activities", heading: "Daily activities" },
  { path: "/announcements", heading: "Announcements" },
  { path: "/bulletins", heading: "Bulletins" },
  { path: "/prayer", heading: "How can we pray with you?" },
];

test("shows the confirmed church identity", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Lifechangers Ministry Incorporated" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Watch a sermon" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Daily activities", exact: true }),
  ).toBeVisible();
});

for (const publicPage of publicPages.slice(1)) {
  test(`loads the published ${publicPage.heading.toLowerCase()} route`, async ({
    page,
  }) => {
    await page.goto(publicPage.path);
    await expect(
      page.getByRole("heading", { name: publicPage.heading, level: 1 }),
    ).toBeVisible();
  });
}

for (const publicPage of publicPages) {
  test(`${publicPage.heading} passes automated accessibility checks`, async ({
    page,
  }) => {
    await page.goto(publicPage.path);

    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

test("offers a keyboard-accessible skip link", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
});

test("does not expose an unreferenced R2 media id", async ({ request }) => {
  const response = await request.get(
    "/media/9d3a2ee4-7f94-4e95-ae5b-5c0650b8749e",
  );
  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("keeps public visitors separate from staff authentication", async ({
  page,
}) => {
  const response = await page.goto("/admin/login");

  expect(response?.headers()["cache-control"]).toContain("no-cache");
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(
    page.getByRole("heading", { name: "Secure sign-in" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Staff authentication is handled by Cloudflare Access/),
  ).toBeVisible();
  await expect(page.getByText(/No password fallback is enabled/)).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
