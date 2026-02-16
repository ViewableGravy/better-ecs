import { expect, test, type Page } from "@playwright/test";

type OverlayState = {
  focused: string;
  counts: Map<string, number>;
  rawText: string;
  placeablesText: string;
};

function parseOverlayState(rawText: string): OverlayState {
  const focusedMatch = rawText.match(/focused:\s*([^\n]+)/);
  const placeablesMatch = rawText.match(/placeables:\s*([^\n]+)/);

  const focused = focusedMatch ? focusedMatch[1].trim().split("stack:")[0].trim() : "";
  const placeablesText = placeablesMatch
    ? placeablesMatch[1]
        .trim()
        .split("outsideAlpha:")[0]
        .trim()
    : "";

  const counts = new Map<string, number>();
  for (const part of placeablesText.split("|").map((item) => item.trim())) {
    if (!part) {
      continue;
    }

    const [contextId, countText] = part.split(":");
    if (!contextId || !countText) {
      continue;
    }

    const count = Number.parseInt(countText, 10);
    if (Number.isNaN(count)) {
      continue;
    }

    counts.set(contextId.trim(), count);
  }

  return { focused, counts, rawText, placeablesText };
}

async function readOverlayState(page: Page): Promise<OverlayState> {
  const rawText = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll("div")).filter((node) => {
      const text = node.textContent ?? "";
      return text.includes("Spatial Contexts Debug") && text.includes("placeables:");
    });

    const last = candidates.at(-1);
    return last?.textContent ?? "";
  });

  return parseOverlayState(rawText);
}

function countFor(state: OverlayState, contextId: string): number {
  return state.counts.get(contextId) ?? 0;
}

async function waitForFocused(
  page: Page,
  expectedFocused: string,
  timeoutMs = 10_000,
): Promise<OverlayState> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const state = await readOverlayState(page);
    if (state.focused === expectedFocused) {
      return state;
    }

    await page.waitForTimeout(50);
  }

  const state = await readOverlayState(page);
  throw new Error(
    `Timed out waiting for focused context ${expectedFocused}. Last focused: ${state.focused}. Overlay: ${state.rawText}`,
  );
}

async function holdMovementUntilFocused(
  page: Page,
  key: string,
  expectedFocused: string,
  timeoutMs = 10_000,
): Promise<OverlayState> {
  await page.mouse.click(400, 300);
  await page.keyboard.down(key);

  try {
    return await waitForFocused(page, expectedFocused, timeoutMs);
  } finally {
    await page.keyboard.up(key);
  }
}

async function placeAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.click(x, y, { button: "left" });
  await page.waitForTimeout(120);
}

async function placeInsideHouse(page: Page): Promise<OverlayState> {
  const baselineState = await readOverlayState(page);
  const baselineHouseCount = countFor(baselineState, "house_1");
  const candidatePoints = [
    [700, 360],
    [760, 360],
    [820, 360],
    [700, 300],
    [760, 300],
    [820, 300],
    [700, 420],
    [760, 420],
    [820, 420],
    [640, 300],
    [640, 420],
    [880, 360],
  ];

  for (const [x, y] of candidatePoints) {
    await placeAt(page, x, y);
    const state = await readOverlayState(page);
    if (state.focused !== "house_1") {
      continue;
    }

    if (countFor(state, "house_1") > baselineHouseCount) {
      return state;
    }
  }

  const state = await readOverlayState(page);
  throw new Error(`Failed to place inside house while focused house_1. Overlay=${state.rawText}`);
}

test.describe("spatial context placement", () => {
  test("keeps outside and house placements in their own worlds", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Go to Spatial Contexts Demo" }).click();
    await page.waitForTimeout(250);
    await page.keyboard.press("1");
    await page.waitForTimeout(120);

    const initial = await waitForFocused(page, "default");

    await holdMovementUntilFocused(page, "d", "house_1", 12_000);
    await page.keyboard.down("d");
    await page.waitForTimeout(1400);
    await page.keyboard.up("d");
    await page.waitForTimeout(120);
    const inHouse = await waitForFocused(page, "house_1");

    const defaultBeforeInsidePlacement = countFor(inHouse, "default");
    const houseBeforeInsidePlacement = countFor(inHouse, "house_1");

    const afterInsidePlacement = await placeInsideHouse(page);
    const defaultAfterInsidePlacement = countFor(afterInsidePlacement, "default");
    const houseAfterInsidePlacement = countFor(afterInsidePlacement, "house_1");

    expect(houseAfterInsidePlacement).toBe(houseBeforeInsidePlacement + 1);
    expect(defaultAfterInsidePlacement).toBe(defaultBeforeInsidePlacement);

    const defaultBeforeOutsidePlacement = countFor(afterInsidePlacement, "default");
    const houseBeforeOutsidePlacement = countFor(afterInsidePlacement, "house_1");

    await placeAt(page, 120, 360);

    const afterOutsideWhileInside = await readOverlayState(page);
    const defaultAfterOutsidePlacement = countFor(afterOutsideWhileInside, "default");
    const houseAfterOutsidePlacement = countFor(afterOutsideWhileInside, "house_1");

    expect(defaultAfterOutsidePlacement).toBe(defaultBeforeOutsidePlacement + 1);
    expect(houseAfterOutsidePlacement).toBe(houseBeforeOutsidePlacement);

    await holdMovementUntilFocused(page, "a", "default", 12_000);
    const afterExit = await waitForFocused(page, "default");

    const defaultBeforeOverworldPlacement = countFor(afterExit, "default");
    const houseBeforeOverworldPlacement = countFor(afterExit, "house_1");

    await placeAt(page, 80, 360);

    const afterOverworldPlacement = await readOverlayState(page);
    const defaultAfterOverworldPlacement = countFor(afterOverworldPlacement, "default");
    const houseAfterOverworldPlacement = countFor(afterOverworldPlacement, "house_1");

    expect(defaultAfterOverworldPlacement).toBe(defaultBeforeOverworldPlacement + 1);
    expect(houseAfterOverworldPlacement).toBe(houseBeforeOverworldPlacement);

    expect(initial.placeablesText.length).toBeGreaterThanOrEqual(0);
  });
});
