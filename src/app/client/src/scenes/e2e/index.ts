import { ConveyorBeltComponent } from "@client/components/conveyor-belt";
import { OUTSIDE, RenderVisibility } from "@client/components/render-visibility";
import { spawnGear } from "@client/entities/gear";
import { GhostPreviewComponent } from "@client/entities/ghost";
import { ensurePlayer } from "@client/entities/player";
import { createPlayerSprite } from "@client/entities/player/render/createPlayerSprite";
import { destroyTransportBelt, spawnTransportBelt } from "@client/entities/transport-belt";
import { ConveyorUtils } from "@client/entities/transport-belt/ConveyorUtils";
import type { TransportBeltEntityId } from "@client/entities/transport-belt/types";
import { setupContextPlayer } from "@client/scenes/world/contexts/shared";
import { System as MotionProbeSystem } from "@client/systems/e2e/motion-probe";
import { System as BuildModeSystem } from "@client/systems/world/build-mode";
import { Placeable } from "@client/systems/world/build-mode/components";
import { System as ConveyorEntityMotionSystem } from "@client/systems/world/conveyor-entity-motion";
import { DebugOverlaySystem } from "@client/systems/world/debug-overlay";
import { PlayerOrbitSystem } from "@client/systems/world/player-orbit";
import type { EntityId, UserWorld } from "@engine";
import { AnimatedSprite, Camera, Debug, Transform2D } from "@engine/components";
import { Engine, FromEngine, fromContext } from "@engine/context";
import { contextId, createContextScene, defineContext } from "@libs/spatial-contexts";

const ROOT_CONTEXT_ID = contextId("default");
const PLAYER_START_X = 0;
const PLAYER_START_Y = 0;
const BELT_ROW_START_X = -120;
const BELT_ROW_Y = -140;
const BELT_SPACING = 20;
const MOTION_PROBE_START_X = -90;
const MOTION_PROBE_Y = 120;
const BELT_PLAYBACK_RATE_PER_TICK = 0.25;
const PROBE_PLAYBACK_RATE_PER_TICK = 0.5;

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type VisualScenarioEntities = {
  beltEntityIds: TransportBeltEntityId[];
  trackedGearId: EntityId | null;
  motionProbeEntityId: EntityId | null;
};

type VisualScenarioAssetLoader = {
  loadSheet: (sheetId: "iron-gear" | "transport-belt") => Promise<unknown>;
};

type VisualBeltState = {
  beltEntityId: TransportBeltEntityId;
  side: "left" | "right";
  slotIndex: number;
  progress: number;
  worldX: number;
  worldY: number;
};

type MotionProbeState = {
  worldX: number;
  worldY: number;
};

type E2ESceneHarness = {
  world: UserWorld;
  reset: () => void;
  placeableCount: () => number;
  focusedContextId: () => string;
  resetPlayer: () => void;
  ghostPosition: () => { x: number; y: number } | null;
  pauseEngine: () => void;
  resumeEngine: () => void;
  resetVisualScenario: () => Promise<void>;
  visualScenarioTick: () => number;
  trackedBeltState: () => VisualBeltState | null;
  motionProbeState: () => MotionProbeState | null;
};

declare global {
  interface Window {
    __BETTER_ECS_E2E__?: E2ESceneHarness;
  }
}

export const Scene = createContextScene("E2EScene")({
  systems: [
    MotionProbeSystem,
    ConveyorEntityMotionSystem,
    PlayerOrbitSystem,
    BuildModeSystem,
    DebugOverlaySystem,
  ],
  contexts: [
    defineContext({
      id: ROOT_CONTEXT_ID,
      policy: {
        visibility: "stack",
        simulation: "focused-only",
      },
      setup(world) {
        setupContextPlayer(world, PLAYER_START_X, PLAYER_START_Y);
      },
    }),
  ],
  async setup(_world, manager) {
    manager.ensureWorldLoaded(ROOT_CONTEXT_ID);
    manager.setFocusedContextId(ROOT_CONTEXT_ID);

    const rootWorld = manager.requireWorld(ROOT_CONTEXT_ID);
    const engine = fromContext(Engine);
    const assets = fromContext(FromEngine.Assets);

    await assets.loadSheet("player-idle");
    await assets.loadSheet("player-moving");

    const visualScenario = createVisualScenarioHarness(rootWorld, assets);

    setPrimaryCameraPosition(rootWorld, 0, 0);

    window.__BETTER_ECS_E2E__ = {
      world: rootWorld,
      reset() {
        resetPlacementScene(rootWorld, manager);
      },
      placeableCount() {
        return countPlaceables(rootWorld);
      },
      focusedContextId() {
        return manager.focusedContextId;
      },
      resetPlayer() {
        const playerId = ensurePlayer(rootWorld);
        const playerTransform = rootWorld.get(playerId, Transform2D);
        if (playerTransform) {
          playerTransform.curr.pos.set(PLAYER_START_X, PLAYER_START_Y);
          playerTransform.prev.pos.set(PLAYER_START_X, PLAYER_START_Y);
        }
      },
      ghostPosition() {
        const [ghostEntityId] = rootWorld.query(GhostPreviewComponent, Transform2D);

        if (ghostEntityId === undefined) {
          return null;
        }

        const transform = rootWorld.require(ghostEntityId, Transform2D);

        return {
          x: transform.curr.pos.x,
          y: transform.curr.pos.y,
        };
      },
      pauseEngine() {
        engine.editor.runningState.pause();
      },
      resumeEngine() {
        engine.editor.runningState.resume();
      },
      resetVisualScenario() {
        return visualScenario.reset(engine.meta.updateTick);
      },
      visualScenarioTick() {
        return engine.meta.updateTick - visualScenario.startTick;
      },
      trackedBeltState() {
        return visualScenario.readTrackedBeltState();
      },
      motionProbeState() {
        return visualScenario.readMotionProbeState();
      },
    };
  },
});

function countPlaceables(world: UserWorld): number {
  return world.query(Placeable).length;
}

function createVisualScenarioHarness(world: UserWorld, assets: VisualScenarioAssetLoader) {
  const state = {
    startTick: 0,
    assetsReady: false,
    entities: createEmptyVisualScenarioEntities(),
  };

  return {
    get startTick() {
      return state.startTick;
    },
    async reset(startTick: number) {
      await ensureVisualScenarioAssetsLoaded(assets, state);
      teardownVisualScenario(world, state.entities);

      state.startTick = startTick;
      state.entities.beltEntityIds = spawnHarnessBeltRow(world);
      state.entities.trackedGearId = spawnGear(world, { size: "large" });
      state.entities.motionProbeEntityId = spawnMotionProbe(world);

      configureHarnessBeltSprites(world, state.entities.beltEntityIds, startTick);
      resetMotionProbe(world, state.entities.motionProbeEntityId, startTick);

      const [firstBeltEntityId] = state.entities.beltEntityIds;
      const trackedGearId = state.entities.trackedGearId;

      if (firstBeltEntityId && trackedGearId) {
        ConveyorUtils.addEntity(world, firstBeltEntityId, trackedGearId, "left", 0, 0);
      }
    },
    readTrackedBeltState() {
      return readTrackedBeltState(world, state.entities.beltEntityIds, state.entities.trackedGearId);
    },
    readMotionProbeState() {
      return readMotionProbeState(world, state.entities.motionProbeEntityId);
    },
  };
}

function ensureVisualScenarioAssetsLoaded(
  assets: VisualScenarioAssetLoader,
  state: { assetsReady: boolean },
): Promise<void> {
  if (state.assetsReady) {
    return Promise.resolve();
  }

  return Promise.all([
    assets.loadSheet("iron-gear"),
    assets.loadSheet("transport-belt"),
  ]).then(() => {
    state.assetsReady = true;
  });
}

function createEmptyVisualScenarioEntities(): VisualScenarioEntities {
  return {
    beltEntityIds: [],
    trackedGearId: null,
    motionProbeEntityId: null,
  };
}

function teardownVisualScenario(world: UserWorld, entities: VisualScenarioEntities): void {
  for (const beltEntityId of entities.beltEntityIds) {
    destroyTransportBelt(world, beltEntityId);
  }

  if (entities.trackedGearId !== null) {
    world.destroy(entities.trackedGearId);
  }

  if (entities.motionProbeEntityId !== null) {
    world.destroy(entities.motionProbeEntityId);
  }

  entities.beltEntityIds = [];
  entities.trackedGearId = null;
  entities.motionProbeEntityId = null;
}

function spawnHarnessBeltRow(world: UserWorld): TransportBeltEntityId[] {
  return [0, 1, 2, 3].map((offset) => {
    return spawnTransportBelt(world, {
      x: BELT_ROW_START_X + offset * BELT_SPACING,
      y: BELT_ROW_Y,
      variant: "horizontal-right",
    });
  });
}

function spawnMotionProbe(world: UserWorld): EntityId {
  const entityId = world.create();
  const sprite = createPlayerSprite("moving", "e");

  world.add(entityId, new Transform2D(MOTION_PROBE_START_X, MOTION_PROBE_Y, 0));
  world.add(entityId, sprite);
  world.add(entityId, new RenderVisibility(OUTSIDE, 1));
  world.add(entityId, new Debug("e2e-motion-probe"));

  return entityId;
}

function configureHarnessBeltSprites(
  world: UserWorld,
  beltEntityIds: readonly TransportBeltEntityId[],
  startTick: number,
): void {
  for (const beltEntityId of beltEntityIds) {
    const sprite = world.get(beltEntityId, AnimatedSprite);

    if (!sprite) {
      continue;
    }

    sprite.playbackMode = "tick";
    sprite.playbackRate = BELT_PLAYBACK_RATE_PER_TICK;
    sprite.useGlobalOffset = false;
    sprite.startTick = startTick;
  }
}

function resetMotionProbe(world: UserWorld, entityId: EntityId, startTick: number): void {
  const transform = world.get(entityId, Transform2D);

  if (transform) {
    transform.curr.pos.set(MOTION_PROBE_START_X, MOTION_PROBE_Y);
    transform.prev.pos.set(MOTION_PROBE_START_X, MOTION_PROBE_Y);
  }

  const sprite = world.get(entityId, AnimatedSprite);

  if (!sprite) {
    return;
  }

  sprite.playbackMode = "tick";
  sprite.playbackRate = PROBE_PLAYBACK_RATE_PER_TICK;
  sprite.useGlobalOffset = false;
  sprite.startTick = startTick;
}

function readTrackedBeltState(
  world: UserWorld,
  beltEntityIds: readonly TransportBeltEntityId[],
  trackedGearId: EntityId | null,
): VisualBeltState | null {
  if (trackedGearId === null) {
    return null;
  }

  const transform = world.get(trackedGearId, Transform2D);

  for (const beltEntityId of beltEntityIds) {
    const conveyor = world.get(beltEntityId, ConveyorBeltComponent);

    if (!conveyor) {
      continue;
    }

    for (const side of ["left", "right"] as const) {
      const slots = side === "left" ? conveyor.left : conveyor.right;
      const progress = side === "left" ? conveyor.leftProgress : conveyor.rightProgress;
      const slotIndex = slots.findIndex((entityId) => entityId === trackedGearId);

      if (slotIndex === -1) {
        continue;
      }

      return {
        beltEntityId,
        side,
        slotIndex,
        progress: progress[slotIndex] ?? 0,
        worldX: transform?.curr.pos.x ?? 0,
        worldY: transform?.curr.pos.y ?? 0,
      };
    }
  }

  return null;
}

function readMotionProbeState(world: UserWorld, entityId: EntityId | null): MotionProbeState | null {
  if (entityId === null) {
    return null;
  }

  const transform = world.get(entityId, Transform2D);

  if (!transform) {
    return null;
  }

  return {
    worldX: transform.curr.pos.x,
    worldY: transform.curr.pos.y,
  };
}

function setPrimaryCameraPosition(world: UserWorld, x: number, y: number): void {
  for (const cameraEntityId of world.query(Camera, Transform2D)) {
    const transform = world.get(cameraEntityId, Transform2D);

    if (!transform) {
      continue;
    }

    transform.curr.pos.set(x, y);
    transform.prev.pos.set(x, y);
  }
}

function resetPlacementScene(world: UserWorld, manager: { setFocusedContextId: (id: typeof ROOT_CONTEXT_ID) => void }): void {
  for (const entityId of world.query(Placeable)) {
    world.destroy(entityId);
  }

  manager.setFocusedContextId(ROOT_CONTEXT_ID);

  const playerId = ensurePlayer(world);
  const playerTransform = world.get(playerId, Transform2D);

  if (playerTransform) {
    playerTransform.curr.pos.set(PLAYER_START_X, PLAYER_START_Y);
    playerTransform.prev.pos.set(PLAYER_START_X, PLAYER_START_Y);
  }
}

