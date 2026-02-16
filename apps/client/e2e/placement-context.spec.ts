import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __BETTER_ECS_E2E__?: {
      reset: () => void;
      placeableCount: () => number;
      focusedContextId: () => string;
    };
  }
}

type E2EHarnessSnapshot = {
  placeableCount: number;
  focusedContextId: string;
};

async function waitForHarness(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__BETTER_ECS_E2E__));
}

async function resetScene(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__BETTER_ECS_E2E__?.reset();
  });
}

async function readHarness(page: Page): Promise<E2EHarnessSnapshot> {
  return page.evaluate(() => ({
    placeableCount: window.__BETTER_ECS_E2E__?.placeableCount() ?? -1,
    focusedContextId: window.__BETTER_ECS_E2E__?.focusedContextId() ?? "",
  }));
}

async function placeAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.click(x, y, { button: "left" });
  await page.waitForTimeout(120);
}

async function deleteAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.click(x, y, { button: "right" });
  await page.waitForTimeout(120);
}

test.describe("placement e2e scene", () => {
  test("supports setup, placement assertions, and teardown-driven reset", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Go to E2E Scene" }).click();

    await waitForHarness(page);

    await resetScene(page);
    await page.keyboard.press("1");
    await page.waitForTimeout(120);

    const baseline = await readHarness(page);
    expect(baseline.focusedContextId).toBe("default");
    expect(baseline.placeableCount).toBe(0);

    await placeAt(page, 260, 260);
    await placeAt(page, 320, 260);

    const afterPlacement = await readHarness(page);
    expect(afterPlacement.placeableCount).toBe(2);

    await deleteAt(page, 260, 260);

    const afterDelete = await readHarness(page);
    expect(afterDelete.placeableCount).toBe(1);

    await resetScene(page);

    const afterReset = await readHarness(page);
    expect(afterReset.placeableCount).toBe(0);
    expect(afterReset.focusedContextId).toBe("default");
  });
});
