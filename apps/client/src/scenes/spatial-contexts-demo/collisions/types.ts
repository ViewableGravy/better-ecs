import { CircleCollider } from "./colliders/circle";
import { CompoundCollider } from "./colliders/compound";
import { RectangleCollider } from "./colliders/rectangle";

export type PrimitiveCollider = CircleCollider | RectangleCollider;
export type Collider = PrimitiveCollider | CompoundCollider;
export type PrimitiveColliderKey = "circle" | "rect";
