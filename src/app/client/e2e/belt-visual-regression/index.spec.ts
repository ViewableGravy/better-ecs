import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type TrackedBeltState = {
  slotIndex: number;
  progress: number;
  worldX: number;
  worldY: number;
};

type MotionProbeState = {
  worldX: number;
  worldY: number;
};

declare global {
  interface Window {
    __BETTER_ECS_E2E__?: {
      pauseEngine: () => void;
      resumeEngine: () => void;
      resetVisualScenario: () => Promise<void>;
      visualScenarioTick: () => number;
      trackedBeltState: () => TrackedBeltState | null;
      motionProbeState: () => MotionProbeState | null;
    };
  }
}

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

test.afterEach(async ({ page }, testInfo) => {
  const video = page.video();

  if (!video) {
    return;
  }

  const videosDirectory = join(dirname(testInfo.file), "videos");

  mkdirSync(videosDirectory, { recursive: true });
  await page.close();
  await video.saveAs(join(videosDirectory, `${testInfo.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.webm`));
});

async function waitForHarness(page: Page, timeout = 15_000): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__BETTER_ECS_E2E__), undefined, { timeout });
}

async function enterE2EScene(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(document.getElementById("to-e2e")));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.evaluate(() => {
      (document.getElementById("to-e2e") as HTMLButtonElement | null)?.click();
    });

    try {
      await waitForHarness(page, 5_000);
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }
  }
}

async function resetVisualScenario(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await window.__BETTER_ECS_E2E__?.resetVisualScenario();
  });
}

async function pauseEngine(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__BETTER_ECS_E2E__?.pauseEngine();
  });
}

async function resumeEngine(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__BETTER_ECS_E2E__?.resumeEngine();
  });
}

async function waitForPausedRender(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

async function waitForVisualTick(page: Page, tick: number): Promise<void> {
  await page.waitForFunction((targetTick) => {
    return (window.__BETTER_ECS_E2E__?.visualScenarioTick() ?? -1) >= targetTick;
  }, tick);
}

async function readTrackedBeltState(page: Page): Promise<TrackedBeltState | null> {
  return page.evaluate(() => {
    return window.__BETTER_ECS_E2E__?.trackedBeltState() ?? null;
  });
}

async function readMotionProbeState(page: Page): Promise<MotionProbeState | null> {
  return page.evaluate(() => {
    return window.__BETTER_ECS_E2E__?.motionProbeState() ?? null;
  });
}

test.describe("belt visual regression", () => {
  test("keeps belt items and moving sprites visually stable when fps exceeds ups", async ({ page }) => {
    await enterE2EScene(page);

    const canvas = page.locator("canvas");
    const sampledTicks = [0, 16, 32, 48, 60] as const;
    const sampledProbeXs: number[] = [];

    for (const tick of sampledTicks) {
      await resetVisualScenario(page);
      await pauseEngine(page);

      if (tick > 0) {
        await resumeEngine(page);
        await waitForVisualTick(page, tick);
        await pauseEngine(page);
      }

      await waitForPausedRender(page);

      const beltState = await readTrackedBeltState(page);
      const motionProbeState = await readMotionProbeState(page);

      expect(beltState).not.toBeNull();
      expect(motionProbeState).not.toBeNull();

      sampledProbeXs.push(motionProbeState?.worldX ?? Number.NaN);

      const screenshot = await canvas.screenshot();

      expect(screenshot).toMatchSnapshot(`belt-visual-regression-tick-${tick}.png`, {
        maxDiffPixels: 500,
      });
      await resumeEngine(page);
    }

    expect(sampledProbeXs[0]).toBeLessThan(sampledProbeXs[1] ?? Number.NEGATIVE_INFINITY);
    expect(sampledProbeXs[1]).toBeLessThan(sampledProbeXs[2] ?? Number.NEGATIVE_INFINITY);
    expect(sampledProbeXs[2]).toBeLessThan(sampledProbeXs[3] ?? Number.NEGATIVE_INFINITY);
    expect(sampledProbeXs[3]).toBeLessThan(sampledProbeXs[4] ?? Number.NEGATIVE_INFINITY);
  });
});