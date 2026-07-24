import type { EntityId } from "@engine/ecs/entity";
import type { Registry } from "@engine/ecs/registry/registry";

export type ComponentMutationKind = "added" | "patched" | "removed";

export interface RegistryMutationObserver {
  entityChanged?(registry: Registry, entityId: EntityId): void;
  componentChanged?(
    registry: Registry,
    entityId: EntityId,
    componentType: Function,
    kind: ComponentMutationKind,
    component: unknown,
  ): void;
  registryReset?(registry: Registry): void;
}
