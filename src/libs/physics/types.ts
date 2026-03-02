import { CircleCollider } from "@lib/physics/colliders/circle";
import { CompoundCollider } from "@lib/physics/colliders/compound";
import { RectangleCollider } from "@lib/physics/colliders/rectangle";

export type PrimitiveCollider = CircleCollider | RectangleCollider;
export type Collider = PrimitiveCollider | CompoundCollider;
export type PrimitiveColliderKey = "circle" | "rect";
