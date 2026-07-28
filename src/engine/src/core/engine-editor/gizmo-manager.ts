import invariant from "tiny-invariant";
import { Gizmo, type GizmoHandle } from "@engine/components";
import type { EntityId } from "@engine/ecs/entity";
import type { Registry } from "@engine/ecs/registry";

type EngineEditorGizmoManagerOptions = {
  getRegistry: () => Registry;
};

export class EngineEditorGizmoManager {
  readonly #getRegistry: () => Registry;

  public constructor(options: EngineEditorGizmoManagerOptions) {
    this.#getRegistry = options.getRegistry;
  }

  public create(entityId: EntityId): boolean {
    const registry = this.#getRegistry();

    invariant(
      registry.all().includes(entityId),
      `[EngineEditorGizmoManager]: entity ${entityId} not found in the active scene Registry`,
    );

    this.clear();
    registry.add(entityId, Gizmo, new Gizmo());
    return true;
  }

  public destroy(entityId: EntityId): boolean {
    const registry = this.#getRegistry();
    if (!registry.has(entityId, Gizmo)) {
      return false;
    }

    registry.remove(entityId, Gizmo);
    return true;
  }

  public clear(): void {
    const registry = this.#getRegistry();
    for (const gizmoEntityId of registry.query(Gizmo)) {
      registry.remove(gizmoEntityId, Gizmo);
    }
  }

  public currentEntityId(): EntityId | null {
    for (const entityId of this.#getRegistry().query(Gizmo)) {
      return entityId;
    }

    return null;
  }

  public setHoveredHandle(entityId: EntityId, handle: GizmoHandle | null): void {
    const gizmo = this.#getRegistry().require(entityId, Gizmo);
    if (gizmo.hoveredHandle === handle) {
      return;
    }

    gizmo.hoveredHandle = handle;
  }

  public setActiveHandle(entityId: EntityId, handle: GizmoHandle | null): void {
    const gizmo = this.#getRegistry().require(entityId, Gizmo);
    if (gizmo.activeHandle === handle) {
      return;
    }

    gizmo.activeHandle = handle;
  }
}
