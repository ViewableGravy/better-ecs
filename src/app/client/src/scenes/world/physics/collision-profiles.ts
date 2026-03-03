import { COLLISION_LAYERS, CollisionParticipation } from "@libs/physics";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
const SOLID_LAYERS = COLLISION_LAYERS.SOLID | COLLISION_LAYERS.QUERY | COLLISION_LAYERS.VISIBILITY;
const SOLID_COLLIDES_WITH = COLLISION_LAYERS.ACTOR | COLLISION_LAYERS.SOLID;
const SOLID_QUERYABLE_BY = COLLISION_LAYERS.QUERY | COLLISION_LAYERS.VISIBILITY | COLLISION_LAYERS.ACTOR;
const CONVEYOR_LAYERS = COLLISION_LAYERS.CONVEYOR | COLLISION_LAYERS.QUERY | COLLISION_LAYERS.VISIBILITY;
const CONVEYOR_QUERYABLE_BY = COLLISION_LAYERS.QUERY | COLLISION_LAYERS.VISIBILITY;

export const CollisionProfiles = {
  solid: () => 
    new CollisionParticipation(
      SOLID_LAYERS, 
      SOLID_COLLIDES_WITH, 
      SOLID_QUERYABLE_BY, 
      false
    ),
  actor: () =>
    new CollisionParticipation(
      COLLISION_LAYERS.ACTOR,
      COLLISION_LAYERS.SOLID,
      COLLISION_LAYERS.ACTOR,
      false,
    ),
  conveyor: () => 
    new CollisionParticipation(
      CONVEYOR_LAYERS, 
      0n, 
      CONVEYOR_QUERYABLE_BY, 
      true
    ),
  ghost: () =>
    new CollisionParticipation(
      COLLISION_LAYERS.GHOST | COLLISION_LAYERS.QUERY,
      0n,
      COLLISION_LAYERS.QUERY,
      true,
    ),
} as const;
