import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SerializedSceneState } from "../../scene-state";
import type {
    SceneStateSyncLoadContext,
    SceneStateSyncOutputAdapterContext,
} from "../../types";
import { LocalStorageBackend } from "./backend/LocalStorageBackend";
import { LocalStorageInputAdapter, LocalStorageOutputAdapter } from "./index";
import type { StorageLike } from "./types";

function createStorage(initial: Record<string, string> = {}): StorageLike {
  const state = new Map(Object.entries(initial));

  return {
    getItem(key: string) {
      return state.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      state.set(key, value);
    },
  };
}

function createSceneState(label: string): SerializedSceneState {
  return {
    sceneName: "world",
    worlds: [
      {
        worldId: "default",
        world: {
          sceneId: "world",
          entities: [
            {
              entityId: 1,
              components: [
                {
                  type: "Marker",
                  data: {
                    label,
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

describe("LocalStorage adapters", () => {
  beforeEach(() => {
    LocalStorageBackend.resetForTests();
  });

  it("loads stored scene state once during startup and clears pending bootstrap diffs", async () => {
    const target = createSceneState("hydrated");
    const input = new LocalStorageInputAdapter({
      storageKey: "save",
      storage: createStorage({ save: JSON.stringify(target) }),
    });
    const context = createLoadContext();

    const hydrated = await input.load(context);

    expect(hydrated).toBe(true);
    expect(context.applySceneState).toHaveBeenCalledTimes(1);
    expect(context.applySceneState).toHaveBeenCalledWith(target);
    expect(context.drainDiffCommands).toHaveBeenCalledTimes(1);
  });

  it("seeds backend from the current scene snapshot when no stored state exists", async () => {
    const current = createSceneState("current");
    const serializeSceneState = vi.fn(() => current);
    const input = new LocalStorageInputAdapter({
      storageKey: "save",
      storage: createStorage(),
      flushIntervalMs: 1000,
    });
    const context = createLoadContext({ serializeSceneState });

    const hydrated = await input.load(context);

    expect(hydrated).toBe(false);
    expect(serializeSceneState).toHaveBeenCalledTimes(1);
    expect(context.applySceneState).not.toHaveBeenCalled();
    expect(context.drainDiffCommands).toHaveBeenCalledTimes(1);
  });

  it("emits dirty queue commands without reserializing the scene and flushes asynchronously", async () => {
    vi.useFakeTimers();

    const storage = createStorage();
    const current = createSceneState("seed");
    const input = new LocalStorageInputAdapter({
      storageKey: "save",
      storage,
      flushIntervalMs: 1000,
      frameBudgetMs: 0.5,
    });
    const output = new LocalStorageOutputAdapter({
      storageKey: "save",
      storage,
      flushIntervalMs: 1000,
      frameBudgetMs: 0.5,
    });

    await input.load(createLoadContext({ serializeSceneState: vi.fn(() => current) }));

    const drainCommands = vi.fn(() => [
      {
        op: "set-field" as const,
        version: 1,
        worldId: "default",
        entityId: 1,
        componentType: "Marker",
        changes: {
          label: "updated",
        },
      },
    ]);
    const serializeSceneState = vi.fn(() => createSceneState("should-not-run"));

    output.update(createOutputContext({
      commands: [
        {
          op: "set-field",
          version: 1,
          worldId: "default",
          entityId: 1,
          componentType: "Marker",
          changes: {
            label: "updated",
          },
        },
      ],
      drainCommands,
    }));

    expect(storage.getItem("save")).toBeNull();

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1);

    expect(serializeSceneState).not.toHaveBeenCalled();
    expect(JSON.parse(storage.getItem("save") ?? "null")).toEqual(createSceneState("updated"));

    vi.useRealTimers();
  });

  it("does not read local storage from the runtime emit path", async () => {
    vi.useFakeTimers();

    const storage = createStorage({ save: JSON.stringify(createSceneState("stored")) });
    const getItem = vi.spyOn(storage, "getItem");
    const input = new LocalStorageInputAdapter({
      storageKey: "save",
      storage,
      flushIntervalMs: 1000,
    });
    const output = new LocalStorageOutputAdapter({
      storageKey: "save",
      storage,
      flushIntervalMs: 1000,
    });

    await input.load(createLoadContext());
    getItem.mockClear();

    output.update(createOutputContext({
      commands: [
        {
          op: "set-field",
          version: 1,
          worldId: "default",
          entityId: 1,
          componentType: "Marker",
          changes: {
            label: "runtime",
          },
        },
      ],
      drainCommands: vi.fn(() => [
        {
          op: "set-field" as const,
          version: 1,
          worldId: "default",
          entityId: 1,
          componentType: "Marker",
          changes: {
            label: "runtime",
          },
        },
      ]),
    }));

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1);

    expect(getItem).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

function createLoadContext(overrides: Partial<SceneStateSyncLoadContext> = {}): SceneStateSyncLoadContext {
  return {
    engine: {} as never,
    scene: {} as never,
    serializeSceneState: vi.fn(() => createSceneState("seed")),
    applySceneState: vi.fn(),
    drainDiffCommands: vi.fn(() => []),
    ...overrides,
  };
}

function createOutputContext(
  overrides: Partial<SceneStateSyncOutputAdapterContext> = {},
): SceneStateSyncOutputAdapterContext {
  return {
    engine: {} as never,
    scene: {} as never,
    updateDelta: 16,
    commands: [],
    drainCommands: vi.fn(() => []),
    ...overrides,
  };
}