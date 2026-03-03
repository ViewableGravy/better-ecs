export { collides } from "@libs/physics/check";
export { CircleCollider } from "@libs/physics/colliders/circle";
export { CompoundCollider } from "@libs/physics/colliders/compound";
export {
	CollisionParticipation,
	COLLISION_LAYERS,
	type CollisionLayerMask,
} from "@libs/physics/entity/collision-participation";
export { RectangleCollider } from "@libs/physics/colliders/rectangle";
export { getEntityCollider } from "@libs/physics/entity/get";
export {
	canResolvePhysicsPair,
	entityInLayer,
	inLayer,
	matchesSpatialQuery,
	type SpatialQueryFilter,
} from "@libs/physics/filters";
export { PhysicsWorld, type PhysicsBody, type OverlapQuery } from "@libs/physics/physics-world";
export { resolve } from "@libs/physics/resolve";
export type { Collider, PrimitiveCollider } from "@libs/physics/types";
export { createPhysics, type PhysicsOpts, ColliderDebugProxy } from "@libs/physics/plugin";

