import invariant from "tiny-invariant";
import { Gizmo, type GizmoHandle } from "@components";
import type { EntityId } from "@ecs/entity";
import type { UserWorld } from "@ecs/world";

type EngineEditorSceneContext = {
  worldEntries: IterableIterator<[string, UserWorld]>;
  requireWorld: (id: string) => UserWorld;
};

type EngineEditorGizmoManagerOptions = {
  getSceneContext: () => EngineEditorSceneContext;
  getActiveWorldId: () => string;
};

export class EngineEditorGizmoManager {
  readonly #getSceneContext: () => EngineEditorSceneContext;
  readonly #getActiveWorldId: () => string;

  public constructor(options: EngineEditorGizmoManagerOptions) {
    this.#getSceneContext = options.getSceneContext;
    this.#getActiveWorldId = options.getActiveWorldId;
  }

  public create(entityId: EntityId, worldId?: string): boolean {
    const sceneContext = this.#getSceneContext();
    const targetWorldId = worldId ?? this.#getActiveWorldId();
    const world = sceneContext.requireWorld(targetWorldId);

    invariant(
      world.all().includes(entityId),
      `[EngineEditorGizmoManager]: entity ${entityId} not found in world ${targetWorldId}`,
    );

    this.clear();
    world.add(entityId, Gizmo, new Gizmo());
    return true;
  }

  public destroy(entityId: EntityId): boolean {
    const sceneContext = this.#getSceneContext();

    for (const [, world] of sceneContext.worldEntries) {
      if (!world.has(entityId, Gizmo)) {
        continue;
      }

      world.remove(entityId, Gizmo);
      return true;
    }

    return false;
  }

  public clear(): void {
    const sceneContext = this.#getSceneContext();

    for (const [, world] of sceneContext.worldEntries) {
      for (const gizmoEntityId of world.query(Gizmo)) {
        world.remove(gizmoEntityId, Gizmo);
      }
    }
  }

  public currentEntityId(): EntityId | null {
    const sceneContext = this.#getSceneContext();

    for (const [, world] of sceneContext.worldEntries) {
      for (const entityId of world.query(Gizmo)) {
        return entityId;
      }
    }

    return null;
  }

  public setHoveredHandle(entityId: EntityId, handle: GizmoHandle | null): void {
    const sceneContext = this.#getSceneContext();

    for (const [, world] of sceneContext.worldEntries) {
      const gizmo = world.require(entityId, Gizmo);

      if (gizmo.hoveredHandle === handle) {
        return;
      }

      gizmo.hoveredHandle = handle;
      return;
    }
  }

  public setActiveHandle(entityId: EntityId, handle: GizmoHandle | null): void {
    const sceneContext = this.#getSceneContext();

    for (const [, world] of sceneContext.worldEntries) {
      const gizmo = world.require(entityId, Gizmo);

      if (gizmo.activeHandle === handle) {
        return;
      }

      gizmo.activeHandle = handle;
      return;
    }
  }
}