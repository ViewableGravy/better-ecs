import { PlayerComponent } from "@client/components/player";
import { ensurePlayer } from "@client/entities/player";
import { PhysicsWorldManager } from "@client/scenes/world/physics/physics-world-manager";
import { mutate } from "@engine";
import { Transform2D } from "@engine/components";
import { COLLISION_LAYERS } from "@libs/physics";
import { createPortalSystem, type PortalActivationArgs } from "@libs/spatial-contexts";

/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
const portalOccupancy = new Set<string>();
const portalActivationFilter = {
  category: COLLISION_LAYERS.ACTOR,
  mask: COLLISION_LAYERS.SOLID,
};

/**********************************************************************************************************
 *   COMPONENT SYSTEM START
 **********************************************************************************************************/
export const System = createPortalSystem({
  name: "main:spatial-contexts-portals",
  shouldActivate: shouldActivatePortal,
  onEnter({ nextWorld }) {
    ensurePlayer(nextWorld);
  },
  onTeleport({ portal, nextWorld }) {
    if (!portal.spawn) return;
    const spawn = portal.spawn;

    const playerId = ensurePlayer(nextWorld);
    const transform = nextWorld.get(playerId, Transform2D);
    if (!transform) return;

    mutate(transform, "curr", (curr) => {
      curr.pos.set(spawn.x, spawn.y);
    });
    transform.prev.pos.set(spawn.x, spawn.y);
  },
});

/**********************************************************************************************************
 *   UTILITIES
 **********************************************************************************************************/
function shouldActivatePortal(args: PortalActivationArgs): boolean {
  const physicsWorld = PhysicsWorldManager.requireWorld(args.world);
  const playerBody = physicsWorld.queryFirstLayer(COLLISION_LAYERS.ACTOR, PlayerComponent);
  if (!playerBody) return false;

  const overlaps = physicsWorld.queryOverlap({
    collider: playerBody.collider,
    transform: playerBody.transform,
    filter: portalActivationFilter,
  });

  let inside = false;
  for (const overlap of overlaps) {
    if (overlap.entityId === args.portalEntity) {
      inside = true;
      break;
    }
  }

  const portalKey = `${args.focusedContextId}:${args.portalEntity}`;
  const wasInside = portalOccupancy.has(portalKey);

  if (inside) {
    portalOccupancy.add(portalKey);
  } else {
    portalOccupancy.delete(portalKey);
  }

  return inside && !wasInside;
}