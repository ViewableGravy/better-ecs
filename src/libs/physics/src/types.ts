import { CircleCollider } from "@libs/physics/colliders/circle";
import { CompoundCollider } from "@libs/physics/colliders/compound";
import { RectangleCollider } from "@libs/physics/colliders/rectangle";

export type PrimitiveCollider = CircleCollider | RectangleCollider;
export type Collider = PrimitiveCollider | CompoundCollider;
export type PrimitiveColliderKey = "circle" | "rect";
