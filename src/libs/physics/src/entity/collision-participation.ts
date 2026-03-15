import { Component, SerializableComponent, serializable } from "@engine";

export type CollisionLayerMask = bigint;

/**
 * Core collision/query channels used by gameplay and engine systems.
 */
export const COLLISION_LAYERS = {
  /** Physical/static geometry that can block actors. */
  SOLID: 1n << 0n,
  /** Dynamic movers/agents that may resolve physically. */
  ACTOR: 1n << 1n,
  /** Generic query target channel for gameplay probes. */
  QUERY: 1n << 2n,
  /** Geometry intended for visibility/culling queries. */
  VISIBILITY: 1n << 3n,
  /** Conveyor-like gameplay geometry (query-driven, typically non-blocking). */
  CONVEYOR: 1n << 4n,
  /** Ghost/preview geometry used for temporary placement visuals. */
  GHOST: 1n << 5n,
} as const;

/**
 * Collision/query filtering metadata for an entity collider.
 */
@SerializableComponent
export class CollisionParticipation extends Component {
  /**
   * Channels this collider belongs to.
   *
   * Used by both physics and query filtering.
   * Example: `layers = COLLISION_LAYERS.SOLID | COLLISION_LAYERS.VISIBILITY`.
   */
  @serializable("bigint")
  declare public readonly layers: CollisionLayerMask;

  /**
   * Channels this collider can physically collide/resolve against.
   *
   * Used only by physics resolution filtering.
   * Example: `collidesWith = COLLISION_LAYERS.ACTOR | COLLISION_LAYERS.SOLID`.
   */
  @serializable("bigint")
  declare public readonly collidesWith: CollisionLayerMask;

  /**
   * Query categories that are allowed to include this collider.
   *
   * Used only by query filtering.
   * Example: `queryableBy = COLLISION_LAYERS.QUERY | COLLISION_LAYERS.VISIBILITY`.
   */
  @serializable("bigint")
  declare public readonly queryableBy: CollisionLayerMask;

  /**
   * When true, overlap may still be queried but physical resolution is skipped.
   */
  @serializable("boolean")
  declare public readonly isSensor: boolean;

  public constructor(
    layers: CollisionLayerMask,
    collidesWith: CollisionLayerMask,
    queryableBy: CollisionLayerMask,
    isSensor: boolean = false,
  ) {
    super();
    this.layers = layers;
    this.collidesWith = collidesWith;
    this.queryableBy = queryableBy;
    this.isSensor = isSensor;
  }
}
