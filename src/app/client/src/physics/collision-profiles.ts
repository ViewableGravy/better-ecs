import { COLLISION_LAYERS, CollisionParticipation } from "@libs/physics";

const SOLID_LAYERS = COLLISION_LAYERS.SOLID | COLLISION_LAYERS.QUERY | COLLISION_LAYERS.VISIBILITY;

export const CollisionProfiles = {
  solid: () => new CollisionParticipation(
    SOLID_LAYERS,
    COLLISION_LAYERS.ACTOR | COLLISION_LAYERS.SOLID,
    COLLISION_LAYERS.QUERY | COLLISION_LAYERS.VISIBILITY | COLLISION_LAYERS.ACTOR,
    false,
  ),
  actor: () => new CollisionParticipation(
    COLLISION_LAYERS.ACTOR,
    COLLISION_LAYERS.SOLID,
    COLLISION_LAYERS.ACTOR,
    false,
  ),
} as const;
