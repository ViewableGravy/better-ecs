import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __BETTER_ECS_MAIN__?: {
      activeSceneName: () => string | null;
      playerPosition: () => { x: number; y: number } | null;
      cameraPosition: () => { x: number; y: number } | null;
      playerCount: () => number;
      cameraCount: () => number;
      playerScreenPosition: () => { x: number; y: number } | null;
      viewportCenter: () => { x: number; y: number };
      isCameraCentered: () => boolean;
      networkStatus: () => {
        connected: boolean;
        currentVersion: number;
        pendingMessages: number;
        lastAckedCommandId: string | null;
        lastError: string | null;
      };
    };
  }
}

type MovementHarnessSnapshot = {
  activeSceneName: string | null;
  playerPosition: { x: number; y: number } | null;
  cameraPosition: { x: number; y: number } | null;
  playerCount: number;
  cameraCount: number;
  playerScreenPosition: { x: number; y: number } | null;
  viewportCenter: { x: number; y: number };
  isCameraCentered: boolean;
  networkStatus: {
    connected: boolean;
    currentVersion: number;
    pendingMessages: number;
    lastAckedCommandId: string | null;
    lastError: string | null;
  };
};

async function waitForHarness(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__BETTER_ECS_MAIN__));
}

async function waitForConnection(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const harness = window.__BETTER_ECS_MAIN__;

    if (!harness) {
      return false;
    }

    return harness.activeSceneName() === "AuthoritativeNetworkingScene"
      && harness.networkStatus().connected === true
      && harness.playerPosition() !== null
      && harness.cameraPosition() !== null
      && harness.playerScreenPosition() !== null
      && harness.playerCount() === 1
      && harness.cameraCount() === 1
      && harness.isCameraCentered() === true;
  });
}

async function readHarness(page: Page): Promise<MovementHarnessSnapshot> {
  return page.evaluate(() => ({
    activeSceneName: window.__BETTER_ECS_MAIN__?.activeSceneName() ?? null,
    playerPosition: window.__BETTER_ECS_MAIN__?.playerPosition() ?? null,
    cameraPosition: window.__BETTER_ECS_MAIN__?.cameraPosition() ?? null,
    playerCount: window.__BETTER_ECS_MAIN__?.playerCount() ?? 0,
    cameraCount: window.__BETTER_ECS_MAIN__?.cameraCount() ?? 0,
    playerScreenPosition: window.__BETTER_ECS_MAIN__?.playerScreenPosition() ?? null,
    viewportCenter: window.__BETTER_ECS_MAIN__?.viewportCenter() ?? { x: 0, y: 0 },
    isCameraCentered: window.__BETTER_ECS_MAIN__?.isCameraCentered() ?? false,
    networkStatus: window.__BETTER_ECS_MAIN__?.networkStatus() ?? {
      connected: false,
      currentVersion: 0,
      pendingMessages: 0,
      lastAckedCommandId: null,
      lastError: null,
    },
  }));
}

function expectApproxEqual(actual: number, expected: number, tolerance: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

test.describe("authoritative movement", () => {
  test("moves the player through the networking path while keeping the camera centered", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/");
    await page.getByRole("button", { name: "Go to Authoritative Networking Scene" }).click();
    await waitForHarness(page);
    await waitForConnection(page);

    const before = await readHarness(page);

    expect(before.activeSceneName).toBe("AuthoritativeNetworkingScene");
    expect(before.networkStatus.connected).toBe(true);
    expect(before.playerPosition).not.toBeNull();
    expect(before.cameraPosition).not.toBeNull();
    expect(before.playerCount).toBe(1);
    expect(before.cameraCount).toBe(1);
    expect(before.playerScreenPosition).not.toBeNull();
    expect(before.isCameraCentered).toBe(true);
    expectApproxEqual(before.playerScreenPosition?.x ?? 0, before.viewportCenter.x, 2);
    expectApproxEqual(before.playerScreenPosition?.y ?? 0, before.viewportCenter.y, 2);

    await page.keyboard.down("KeyW");
    await page.waitForTimeout(1500);
    await page.keyboard.up("KeyW");
    await page.waitForTimeout(400);

    const after = await readHarness(page);

    expect(after.playerPosition).not.toBeNull();
    expect(after.cameraPosition).not.toBeNull();
    expect(after.playerScreenPosition).not.toBeNull();
    expect(after.isCameraCentered).toBe(true);
    expect(after.playerPosition?.y ?? Infinity).toBeLessThan(before.playerPosition?.y ?? -Infinity);
    expect(after.cameraPosition?.y ?? Infinity).toBeLessThan(before.cameraPosition?.y ?? -Infinity);
    expect(after.playerPosition?.x).toBe(before.playerPosition?.x);
    expect(after.cameraPosition).toEqual(after.playerPosition);
    expectApproxEqual(after.playerScreenPosition?.x ?? 0, after.viewportCenter.x, 2);
    expectApproxEqual(after.playerScreenPosition?.y ?? 0, after.viewportCenter.y, 2);
  });
});