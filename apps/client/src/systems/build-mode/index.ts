import { invariantById } from "@/utilities/selectors";
import { resolveCameraView, screenToWorld } from "@/utilities/world-camera";
import { Vec2, createSystem, useSystem, useWorld, type UserWorld } from "@repo/engine";
import { Color, Shape, Transform2D } from "@repo/engine/components";
import { CircleCollider, RectangleCollider, collides, getEntityCollider } from "@repo/physics";
import { GhostPreview, GridFootprint, GridPosition, Placeable } from "./components";
import { GRID_CELL_SIZE } from "./constants";
import { buildModeState } from "./state";

const HOTBAR_SLOT_BOX = "Digit1";
const HOTBAR_SLOT_EMPTY = "Digit2";
const GRID_TOGGLE_CODE = "KeyG";
const COLLIDER_TOGGLE_CODE = "KeyH";
const BOX_SIZE = GRID_CELL_SIZE;
const GHOST_FILL = new Color(1, 0.1, 0.7, 0.25);
const GHOST_STROKE = new Color(1, 0.35, 0.85, 0.95);
const PLACED_FILL = new Color(1, 0.2, 0.8, 1);
const PLACED_STROKE = new Color(1, 1, 1, 1);
const DELETE_POINT_RADIUS = 0.001;
const HALF_BOX_SIZE = BOX_SIZE / 2;

const placementCollider = new RectangleCollider(
  new Vec2(-HALF_BOX_SIZE, -HALF_BOX_SIZE),
  new Vec2(BOX_SIZE, BOX_SIZE),
);
const placementTransform = new Transform2D(0, 0);
const deletePointCollider = new CircleCollider(DELETE_POINT_RADIUS);
const deletePointTransform = new Transform2D(0, 0);

let indicatorNode: HTMLDivElement | null = null;

export const System = createSystem("demo:build-mode")({
  initialize() {
    const canvas = invariantById<HTMLCanvasElement>("game");

    indicatorNode = document.createElement("div");
    indicatorNode.id = "build-hotbar-indicator";
    indicatorNode.style.position = "fixed";
    indicatorNode.style.right = "12px";
    indicatorNode.style.top = "12px";
    indicatorNode.style.zIndex = "1200";
    indicatorNode.style.padding = "6px 10px";
    indicatorNode.style.borderRadius = "6px";
    indicatorNode.style.border = "1px solid #ffffff66";
    indicatorNode.style.fontFamily = "monospace";
    indicatorNode.style.fontSize = "12px";
    indicatorNode.style.color = "#fff";
    indicatorNode.style.background = "#00000066";
    indicatorNode.style.userSelect = "none";
    indicatorNode.style.pointerEvents = "none";
    indicatorNode.style.display = "none";
    indicatorNode.innerText = "Selected: none";
    document.body.appendChild(indicatorNode);

    const updatePointer = (event: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      buildModeState.mouseScreenX = event.clientX - rect.left;
      buildModeState.mouseScreenY = event.clientY - rect.top;
    };

    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event);
    };

    const onPointerDown = (event: PointerEvent) => {
      updatePointer(event);

      if (event.button === 0) {
        buildModeState.pendingPlace = true;
      }

      if (event.button === 2) {
        buildModeState.pendingDelete = true;
        event.preventDefault();
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.ctrlKey || event.metaKey;
      if (!hasModifier) {
        return;
      }

      if (event.code === GRID_TOGGLE_CODE || event.code === COLLIDER_TOGGLE_CODE) {
        event.preventDefault();
      }
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);

      if (indicatorNode) {
        indicatorNode.remove();
        indicatorNode = null;
      }
    };
  },
  system() {
    const world = useWorld();
    const input = useSystem("engine:input");



    handleKeyboard(input.data.keysDown, input.data.pressedThisTick);
    updateIndicator();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const camera = resolveCameraView(world, viewportHeight);
    const worldPointer = screenToWorld(
      buildModeState.mouseScreenX,
      buildModeState.mouseScreenY,
      viewportWidth,
      viewportHeight,
      camera,
    );

    const snappedX = snapToGrid(worldPointer.x);
    const snappedY = snapToGrid(worldPointer.y);

    syncGhost(world, snappedX, snappedY);

    const shouldDelete = buildModeState.pendingDelete;
    const shouldPlace = buildModeState.pendingPlace;
    buildModeState.pendingDelete = false;
    buildModeState.pendingPlace = false;

    if (shouldDelete) {
      deleteAt(world, worldPointer.x, worldPointer.y);
    }

    if (!shouldPlace || buildModeState.selectedItem !== "box") {
      return;
    }

    placeBox(world, snappedX, snappedY);
  },
});

function handleKeyboard(keysDown: ReadonlySet<string>, pressedThisTick: ReadonlySet<string>): void {
  if (pressedThisTick.has(HOTBAR_SLOT_BOX)) {
    buildModeState.selectedItem = "box";
  }

  if (pressedThisTick.has(HOTBAR_SLOT_EMPTY)) {
    buildModeState.selectedItem = null;
  }

  const hasModifier = hasCtrlOrMeta(keysDown);
  if (!hasModifier) {
    return;
  }

  if (pressedThisTick.has(GRID_TOGGLE_CODE)) {
    buildModeState.gridVisible = !buildModeState.gridVisible;
  }

  if (pressedThisTick.has(COLLIDER_TOGGLE_CODE)) {
    buildModeState.colliderDebugVisible = !buildModeState.colliderDebugVisible;
  }
}

function hasCtrlOrMeta(keysDown: ReadonlySet<string>): boolean {
  for (const code of keysDown) {
    if (code === "ControlLeft" || code === "ControlRight") {
      return true;
    }

    if (code === "MetaLeft" || code === "MetaRight") {
      return true;
    }
  }

  return false;
}

function snapToGrid(value: number): number {
  return Math.floor(value / GRID_CELL_SIZE) * GRID_CELL_SIZE;
}

function updateIndicator(): void {
  if (!indicatorNode) {
    return;
  }

  indicatorNode.style.display = "block";

  const selectedText = buildModeState.selectedItem ?? "none";
  indicatorNode.innerText = `Selected: ${selectedText}`;
  indicatorNode.style.background = buildModeState.selectedItem ? "#5a125699" : "#00000066";
}

function syncGhost(world: UserWorld, snappedX: number, snappedY: number): void {
  if (buildModeState.selectedItem === null) {
    if (buildModeState.ghostEntityId !== null && world.has(buildModeState.ghostEntityId, GhostPreview)) {
      world.destroy(buildModeState.ghostEntityId);
    }

    buildModeState.ghostEntityId = null;
    return;
  }

  if (buildModeState.ghostEntityId === null || !world.has(buildModeState.ghostEntityId, GhostPreview)) {
    const ghost = world.create();
    world.add(ghost, new Transform2D(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE));
    world.add(
      ghost,
      new Shape("rectangle", BOX_SIZE, BOX_SIZE, GHOST_FILL, GHOST_STROKE, 1, Number.MAX_SAFE_INTEGER, 0),
    );
    world.add(ghost, new GhostPreview());
    buildModeState.ghostEntityId = ghost;
    return;
  }

  const transform = world.get(buildModeState.ghostEntityId, Transform2D);
  if (!transform) {
    return;
  }

  transform.curr.pos.set(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE);
  transform.prev.pos.set(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE);
}

function deleteAt(world: UserWorld, worldX: number, worldY: number): void {
  deletePointTransform.curr.pos.set(worldX, worldY);
  deletePointTransform.prev.pos.set(worldX, worldY);

  for (const entityId of world.query(Transform2D)) {
    const transform = world.get(entityId, Transform2D);
    if (!transform) {
      continue;
    }

    const collider = getEntityCollider(world, entityId);
    if (!collider) {
      continue;
    }

    if (!collides(deletePointCollider, deletePointTransform, collider, transform)) {
      continue;
    }

    world.destroy(entityId);
    return;
  }
}

function placeBox(world: UserWorld, snappedX: number, snappedY: number): void {
  if (!canPlaceBox(world, snappedX, snappedY)) {
    return;
  }

  const placed = world.create();
  world.add(placed, new Transform2D(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE));
  world.add(placed, new Shape("rectangle", BOX_SIZE, BOX_SIZE, PLACED_FILL, PLACED_STROKE, 1));
  world.add(
    placed,
    new RectangleCollider(new Vec2(-HALF_BOX_SIZE, -HALF_BOX_SIZE), new Vec2(BOX_SIZE, BOX_SIZE)),
  );
  world.add(placed, new GridPosition(snappedX, snappedY));
  world.add(placed, new GridFootprint(BOX_SIZE, BOX_SIZE));
  world.add(placed, new Placeable("box"));
}

function canPlaceBox(world: UserWorld, snappedX: number, snappedY: number): boolean {
  placementTransform.curr.pos.set(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE);
  placementTransform.prev.pos.set(snappedX + HALF_BOX_SIZE, snappedY + HALF_BOX_SIZE);

  for (const entityId of world.query(Transform2D)) {
    const transform = world.get(entityId, Transform2D);
    if (!transform) {
      continue;
    }

    const collider = getEntityCollider(world, entityId);
    if (!collider) {
      continue;
    }

    if (collides(placementCollider, placementTransform, collider, transform)) {
      return false;
    }
  }

  return true;
}
