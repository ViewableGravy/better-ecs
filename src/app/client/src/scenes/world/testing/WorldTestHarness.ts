import { PlayerComponent } from "@client/components/player";
import { setupContextPlayer } from "@client/scenes/world/contexts/shared";
import { System as CameraFollow } from "@client/systems/core/camera-follow";
import { System as CommandAllocatorReset } from "@client/systems/core/command-allocator-reset";
import { System as LocalPlayerMovementIntent } from "@client/systems/core/local-player-movement-intent";
import { System as MovementAuthority } from "@client/systems/core/movement";
import type { MovementAxes } from "@client/systems/core/movement/utilities";
import { System as PhysicsWorldSync } from "@client/systems/core/physics-world-sync";
import { System as BuildModeSystem } from "@client/systems/world/build-mode";
import { System as BuildModeAuthoritySystem } from "@client/systems/world/build-mode-authority";
import type { BuildItemType } from "@client/systems/world/build-mode/build-items";
import { supportsDragPlacement } from "@client/systems/world/build-mode/build-items";
import { GridPosition } from "@client/systems/world/build-mode/components/grid-position";
import { Placeable } from "@client/systems/world/build-mode/components/placeable";
import { buildModeStateDefault, type BuildModeState } from "@client/systems/world/build-mode/const";
import { GridSingleton } from "@client/systems/world/build-mode/grid-singleton";
import { System as Collision } from "@client/systems/world/scene-collision";
import { EngineTestHarness, type EntityId } from "@engine";
import { Camera, Transform2D } from "@engine/components";
import { createContextScene } from "@libs/spatial-contexts";

const DEFAULT_VIEWPORT_WIDTH = 800;
const DEFAULT_VIEWPORT_HEIGHT = 600;
const DEFAULT_UPDATE_DELTA = 1000 / 60;

type TestCanvasRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  x: number;
  y: number;
  toJSON: () => Record<string, never>;
};

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type WorldPoint = {
  x: number;
  y: number;
};

type WorldTestHarnessOptions = {
  playerStart?: WorldPoint;
  viewportWidth?: number;
  viewportHeight?: number;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export class WorldTestHarness {
  public readonly engineHarness: EngineTestHarness<[]>;
  readonly #canvas: HTMLCanvasElement;

  private constructor(engineHarness: EngineTestHarness<[]>, canvas: HTMLCanvasElement) {
    this.engineHarness = engineHarness;
    this.#canvas = canvas;
  }

  public static async create(options: WorldTestHarnessOptions = {}): Promise<WorldTestHarness> {
    const playerStart = options.playerStart ?? { x: 0, y: 0 };
    const canvas = createHarnessCanvas(
      options.viewportWidth ?? DEFAULT_VIEWPORT_WIDTH,
      options.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT,
    );

    const TestScene = createContextScene("WorldTestScene")({
      systems: [
        CommandAllocatorReset,
        LocalPlayerMovementIntent,
        MovementAuthority,
        PhysicsWorldSync,
        Collision,
        CameraFollow,
        BuildModeSystem,
        BuildModeAuthoritySystem,
      ],
      contexts: [],
      setup(world) {
        setupContextPlayer(world, playerStart.x, playerStart.y);
      },
    });

    const engineHarness = await EngineTestHarness.create({
      scenes: [TestScene],
      initialScene: "WorldTestScene",
      canvas,
      defaultUpdateDelta: DEFAULT_UPDATE_DELTA,
    });

    const harness = new WorldTestHarness(engineHarness, canvas);
    harness.stepUpdate();

    return harness;
  }

  public get world() {
    return this.engineHarness.world;
  }

  public get engine() {
    return this.engineHarness.engine;
  }

  public stepUpdate(updateDeltaMs: number = DEFAULT_UPDATE_DELTA): void {
    this.engineHarness.stepUpdate(updateDeltaMs);
  }

  public movePlayer(intent: MovementAxes, updateDeltaMs: number): void {
    const input = this.engine.systems["engine:input"].data;

    input.keysDown.clear();

    if (intent.x < 0) {
      input.keysDown.add("KeyA");
    }

    if (intent.x > 0) {
      input.keysDown.add("KeyD");
    }

    if (intent.y < 0) {
      input.keysDown.add("KeyW");
    }

    if (intent.y > 0) {
      input.keysDown.add("KeyS");
    }

    this.stepUpdate(updateDeltaMs);
    input.keysDown.clear();
  }

  public followCamera(): void {
    this.stepUpdate();
  }

  public resolveCollision(): void {
    this.stepUpdate();
  }

  public placeItem(
    itemType: BuildItemType,
    worldX: number,
    worldY: number,
    overrides: Partial<BuildModeState> = {},
  ): boolean {
    const buildModeState = this.engine.systems["main:build-mode-intent"].data as BuildModeState;
    const placeableCountBefore = this.placeableCount();

    Object.assign(buildModeState, buildModeStateDefault, overrides, {
      selectedItem: itemType,
      ghostEntityId: buildModeState.ghostEntityId,
      dragPlacedGridKeys: buildModeState.dragPlacedGridKeys,
    });

    this.setPointerWorld(worldX, worldY);

    if (supportsDragPlacement(itemType)) {
      buildModeState.placePointerActive = true;
    } else {
      buildModeState.pendingPlace = true;
    }

    this.stepUpdate();
    buildModeState.placePointerActive = false;

    return this.placeableCount() > placeableCountBefore;
  }

  public deleteAt(worldX: number, worldY: number): void {
    const buildModeState = this.engine.systems["main:build-mode-intent"].data as BuildModeState;

    this.setPointerWorld(worldX, worldY);
    buildModeState.pendingDelete = true;
    this.stepUpdate();
  }

  public placeableCount(): number {
    return this.world.query(Placeable).length;
  }

  public findPlaceableAtWorld(worldX: number, worldY: number): EntityId | undefined {
    const [gridX, gridY] = GridSingleton.worldToGridCoordinates(worldX, worldY);

    for (const entityId of this.world.query(Placeable, GridPosition)) {
      const gridPosition = this.world.require(entityId, GridPosition);

      if (gridPosition.x === gridX && gridPosition.y === gridY) {
        return entityId;
      }
    }

    return undefined;
  }

  public playerPosition(): WorldPoint {
    const transform = this.requirePlayerTransform();

    return {
      x: transform.curr.pos.x,
      y: transform.curr.pos.y,
    };
  }

  public cameraPosition(): WorldPoint {
    const transform = this.requireCameraTransform();

    return {
      x: transform.curr.pos.x,
      y: transform.curr.pos.y,
    };
  }

  public isCameraCenteredOnPlayer(): boolean {
    const playerTransform = this.requirePlayerTransform();
    const cameraTransform = this.requireCameraTransform();

    return playerTransform.curr.pos.x === cameraTransform.curr.pos.x
      && playerTransform.curr.pos.y === cameraTransform.curr.pos.y
      && playerTransform.prev.pos.x === cameraTransform.prev.pos.x
      && playerTransform.prev.pos.y === cameraTransform.prev.pos.y;
  }

  public requirePlayerEntityId(): EntityId<PlayerComponent> {
    const [playerId] = this.world.invariantQuery(PlayerComponent);

    return playerId;
  }

  public requirePlayerTransform(): Transform2D {
    return this.world.require(this.requirePlayerEntityId(), Transform2D);
  }

  public requireCameraTransform(): Transform2D {
    const [cameraEntityId] = this.world.query(Camera, Transform2D);

    if (cameraEntityId === undefined) {
      throw new Error("Primary camera not found in harness world.");
    }

    return this.world.require(cameraEntityId, Transform2D);
  }

  private setPointerWorld(worldX: number, worldY: number): void {
    const input = this.engine.systems["engine:input"].data;
    const camera = this.engine.utils.activeCameraView(this.world);
    const viewport = this.#canvas.getBoundingClientRect();

    input.mouseClientX = (worldX - camera.x) * camera.zoom + viewport.width / 2;
    input.mouseClientY = (worldY - camera.y) * camera.zoom + viewport.height / 2;
  }
}

function createHarnessCanvas(width: number, height: number): HTMLCanvasElement {
  const rect: TestCanvasRect = {
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };

  // The client harness only needs a minimal canvas surface for mouse/world projection.
  return {
    getBoundingClientRect() {
      return rect;
    },
  } as HTMLCanvasElement;
}