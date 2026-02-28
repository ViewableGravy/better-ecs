import { Parent, Transform2D } from "../../components";
import type { EntityId } from "../../ecs/entity";
import { resolveWorldTransform2D } from "../../ecs/hierarchy";
import type { UserWorld } from "../../ecs/world";
import type { EngineClass } from "../engine";
import type { SceneDefinitionTuple } from "../scene/scene.types";
import type { SystemFactoryTuple } from "../system/types";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
export type EngineMouseEventName = "mouseDown" | "mouseMove" | "mouseUp" | "mouseCancel";

export type Point2D = {
  x: number;
  y: number;
};

export type EngineInputHost = EngineClass<
  SystemFactoryTuple,
  SceneDefinitionTuple,
  Record<string, unknown>
>;

export type EntityAtPointOptions = {
  preferParent?: boolean;
};

const SHARED_TRANSFORM2D = new Transform2D();

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class EngineMouseEvent {
  readonly #type: EngineMouseEventName;
  readonly #event: PointerEvent;
  readonly #engine: EngineInputHost;

  #worldPoint: Point2D | null = null;

  public constructor(type: EngineMouseEventName, event: PointerEvent, engine: EngineInputHost) {
    this.#type = type;
    this.#event = event;
    this.#engine = engine;
  }

  public get type(): EngineMouseEventName {
    return this.#type;
  }

  public get pointerId(): number {
    return this.#event.pointerId;
  }

  public get button(): number {
    return this.#event.button;
  }

  public get altKey(): boolean {
    return this.#event.altKey;
  }

  public get ctrlKey(): boolean {
    return this.#event.ctrlKey;
  }

  public get shiftKey(): boolean {
    return this.#event.shiftKey;
  }

  public get metaKey(): boolean {
    return this.#event.metaKey;
  }

  public get mouseX(): number {
    const rect = this.#engine.canvas.getBoundingClientRect();
    return this.#event.clientX - rect.left;
  }

  public get mouseY(): number {
    const rect = this.#engine.canvas.getBoundingClientRect();
    return this.#event.clientY - rect.top;
  }

  public get worldX(): number {
    return this.#getWorldPoint().x;
  }

  public get worldY(): number {
    return this.#getWorldPoint().y;
  }

  public get originalEvent(): PointerEvent {
    return this.#event;
  }

  public preventDefault(): void {
    this.#event.preventDefault();
  }

  public entityAtPoint(
    maxDistancePixels: number,
    world: UserWorld = this.#engine.scene.world,
    options?: EntityAtPointOptions,
  ): EntityId | null {
    return getEntityAtPoint(
      this.#engine,
      world,
      {
        x: this.worldX,
        y: this.worldY,
      },
      maxDistancePixels,
      options,
    );
  }

  #getWorldPoint(): Point2D {
    const cached = this.#worldPoint;
    if (cached) {
      return cached;
    }

    const next = this.#engine.utils.pointToWorld(
      {
        x: this.mouseX,
        y: this.mouseY,
      },
      this.#engine.scene.world,
    );

    this.#worldPoint = next;
    return next;
  }
}

export function getEntityAtPoint(
  engine: EngineInputHost,
  world: UserWorld,
  point: Point2D,
  maxDistancePixels: number,
  options?: EntityAtPointOptions,
): EntityId | null {
  if (maxDistancePixels <= 0) {
    return null;
  }

  const cameraView = engine.utils.activeCameraView(world);
  const maxDistanceWorld = maxDistancePixels / cameraView.zoom;
  return getEntityAtWorldPoint(world, point, maxDistanceWorld, options);
}

export function getEntityAtWorldPoint(
  world: UserWorld,
  point: Point2D,
  maxDistance: number,
  options?: EntityAtPointOptions,
): EntityId | null {
  if (maxDistance <= 0) {
    return null;
  }

  const maxDistanceSquared = maxDistance * maxDistance;

  let nearestEntityId: EntityId | null = null;
  let nearestDistanceSquared = maxDistanceSquared;

  for (const entityId of world.query(Transform2D)) {
    if (!resolveWorldTransform2D(world, entityId, SHARED_TRANSFORM2D)) {
      continue;
    }

    const deltaX = SHARED_TRANSFORM2D.curr.pos.x - point.x;
    const deltaY = SHARED_TRANSFORM2D.curr.pos.y - point.y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (distanceSquared > nearestDistanceSquared) {
      continue;
    }

    nearestDistanceSquared = distanceSquared;
    nearestEntityId = entityId;
  }

  if (nearestEntityId === null) {
    return null;
  }

  const preferParent = options?.preferParent ?? true;
  if (!preferParent) {
    return nearestEntityId;
  }

  return resolveHierarchyPreferredEntity(world, point, nearestEntityId, nearestDistanceSquared);
}

function resolveHierarchyPreferredEntity(
  world: UserWorld,
  point: Point2D,
  entityId: EntityId,
  maxPreferredDistanceSquared: number,
): EntityId {
  let preferredEntityId = entityId;
  let currentDistanceSquared = maxPreferredDistanceSquared;

  while (true) {
    const parent = world.get(preferredEntityId, Parent);
    if (!parent) {
      return preferredEntityId;
    }

    if (!resolveWorldTransform2D(world, parent.entityId, SHARED_TRANSFORM2D)) {
      return preferredEntityId;
    }

    const deltaX = SHARED_TRANSFORM2D.curr.pos.x - point.x;
    const deltaY = SHARED_TRANSFORM2D.curr.pos.y - point.y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (distanceSquared > currentDistanceSquared) {
      return preferredEntityId;
    }

    preferredEntityId = parent.entityId;
    currentDistanceSquared = distanceSquared;
  }
}