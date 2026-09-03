import { test, expect } from "@playwright/test";

test("home page loads the SCCA class finder intro", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/SCCA Solo Class Finder/);
  await expect(
    page.getByRole("heading", { name: "Find where you belong before sign up" })
  ).toBeVisible();
});
