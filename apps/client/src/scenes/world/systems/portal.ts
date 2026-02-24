import { PlayerComponent } from "@/components/player";
import { ensurePlayer } from "@/entities/player";
import { Transform2D } from "@repo/engine/components";
import { collides, getEntityCollider } from "@repo/physics";
import { createPortalSystem, type PortalActivationArgs } from "@repo/spatial-contexts";

/**********************************************************************************************************
*   CONSTS
**********************************************************************************************************/
const portalOccupancy = new Set<string>();

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

    const playerId = ensurePlayer(nextWorld);
    const transform = nextWorld.get(playerId, Transform2D);
    if (!transform) return;

    transform.curr.pos.set(portal.spawn.x, portal.spawn.y);
    transform.prev.pos.set(portal.spawn.x, portal.spawn.y);
  },
});

/**********************************************************************************************************
 *   UTILITIES
 **********************************************************************************************************/
function shouldActivatePortal(args: PortalActivationArgs): boolean {
  const [playerId] = args.world.query(PlayerComponent);
  if (!playerId) return false;

  const playerTransform = args.world.get(playerId, Transform2D);
  if (!playerTransform) return false;

  const portalTransform = args.world.get(args.portalEntity, Transform2D);
  if (!portalTransform) return false;

  const playerCollider = getEntityCollider(args.world, playerId);
  if (!playerCollider) return false;

  const portalCollider = getEntityCollider(args.world, args.portalEntity);
  if (!portalCollider) return false;

  const inside = collides(playerCollider, playerTransform, portalCollider, portalTransform);

  const portalKey = `${args.focusedContextId}:${args.portalEntity}`;
  const wasInside = portalOccupancy.has(portalKey);

  if (inside) {
    portalOccupancy.add(portalKey);
  } else {
    portalOccupancy.delete(portalKey);
  }

  return inside && !wasInside;
}