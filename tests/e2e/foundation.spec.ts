import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicPages = [
  { path: "/", heading: "Lifechangers Ministry Incorporated" },
  { path: "/about", heading: "About Lifechangers Ministry" },
  { path: "/sermons", heading: "Sermons" },
  { path: "/ministries", heading: "Ministries" },
  { path: "/activities", heading: "Daily activities" },
  { path: "/announcements", heading: "Announcements" },
  { path: "/bulletins", heading: "Bulletins" },
  { path: "/prayer", heading: "How can we pray with you?" },
  { path: "/contact", heading: "Contact the church" },
  { path: "/join", heading: "Join a ministry" },
  { path: "/give", heading: "Give Tithes & Offerings" },
  { path: "/give/success", heading: "Your giving is being confirmed" },
];

test("shows the confirmed church identity", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: /Lifechangers Ministry Incorporated/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Love God. Love people." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Watch a sermon" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "See what’s happening", exact: true }),
  ).toBeVisible();
});

test("groups public navigation without removing routes", async ({ page }) => {
  await page.goto("/");

  const mobileMenu = page.getByText("Menu", { exact: true });
  if (await mobileMenu.isVisible()) {
    await mobileMenu.click();
    const navigation = page.getByLabel("Mobile navigation");

    for (const label of [
      "About",
      "Contact",
      "Ministries",
      "Calendar",
      "Announcements",
      "Bulletins",
      "Messages",
      "Prayer",
      "Give",
    ]) {
      await expect(
        navigation.getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }

    return;
  }

  const navigation = page.getByLabel("Main navigation");

  await navigation.getByText("Our Church", { exact: true }).click();
  await expect(
    navigation.getByRole("link", { name: "About", exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Contact", exact: true }),
  ).toBeVisible();

  await navigation.getByText("Get Connected", { exact: true }).click();
  await expect(
    navigation.getByRole("link", { name: "Ministries", exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Calendar", exact: true }),
  ).toBeVisible();

  await navigation.getByText("Updates", { exact: true }).click();
  await expect(
    navigation.getByRole("link", { name: "Announcements", exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Bulletins", exact: true }),
  ).toBeVisible();
});

test("shows a usable monthly activities planner", async ({ page }) => {
  await page.goto("/activities");

  await expect(
    page.getByRole("heading", { name: "Church calendar", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next", exact: true }),
  ).toBeVisible();
  await expect(page.locator("button[aria-pressed='true']")).toHaveCount(1);
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

// Production and preview denial is verified in local-mode.test.ts. This suite
// intentionally runs next dev against the local D1/R2 environment.
test("uses an explicitly labelled local administrator for local E2E", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", {
      name: "Welcome, LOCAL DEVELOPMENT — System Administrator",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Local development mode — synthetic System Administrator, local D1/R2 only. PayMongo is unavailable.",
    ),
  ).toBeVisible();
});

test("does not expose the removed sandbox route in a production build", async ({
  page,
}) => {
  const response = await page.goto("/admin/sandbox");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Local development mode" }),
  ).toHaveCount(0);
});
