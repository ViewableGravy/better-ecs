import { PlayerComponent } from "@client/components/player";
import { Portal } from "@client/components/portal";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { createSystem } from "@engine";
import { Transform2D } from "@engine/components";
import { ActiveRegistry, fromContext } from "@engine/context";
import { COLLISION_LAYERS } from "@libs/physics";

const PORTAL_FILTER = {
  category: COLLISION_LAYERS.ACTOR,
  mask: COLLISION_LAYERS.SOLID,
};

let requirePortalExit = false;

export const System = createSystem("main:portal-authority")({
  system() {
    const registry = fromContext(ActiveRegistry);
    const physics = PhysicsWorldManager.requireWorld(registry);
    const playerBody = physics.queryFirstLayer(COLLISION_LAYERS.ACTOR, PlayerComponent);
    if (!playerBody) {
      return;
    }

    const overlaps = physics.queryOverlap({
      collider: playerBody.collider,
      transform: playerBody.transform,
      filter: PORTAL_FILTER,
    });
    const portalEntityId = overlaps.find((overlap) => registry.has(overlap.entityId, Portal))?.entityId;

    if (portalEntityId === undefined) {
      requirePortalExit = false;
      return;
    }

    if (requirePortalExit) {
      return;
    }

    const portal = registry.require(portalEntityId, Portal);
    requirePortalExit = true;
    registry.patch(playerBody.entityId, Transform2D, (transform) => {
      transform.curr.pos.set(portal.destination.x, portal.destination.y);
      transform.prev.pos.set(portal.destination.x, portal.destination.y);
    });
  },
});
