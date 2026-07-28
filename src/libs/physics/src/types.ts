import { CircleCollider } from "@libs/physics/colliders/circle";
import { CompoundCollider } from "@libs/physics/colliders/compound";
import { PointCollider } from "@libs/physics/colliders/point";
import { RectangleCollider } from "@libs/physics/colliders/rectangle";

export type PrimitiveCollider = CircleCollider | RectangleCollider | PointCollider;
export type Collider = PrimitiveCollider | CompoundCollider;
export type PrimitiveColliderKey = "circle" | "rect" | "point";
