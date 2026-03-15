import { Color } from "@engine/components/sprite/sprite";
import type { RegisteredAssets } from "@engine/core";
import { Component } from "@engine/ecs/component";
import { SerializableComponent, serializable } from "@engine/serialization";

/**
 * ShaderQuad component — a custom shader rendered onto a quad attached to an entity.
 *
 * The render pipeline resolves `assetId` to a shader source pair and draws a quad
 * using the entity world transform.
 */
@SerializableComponent
export class ShaderQuad extends Component {
  /** Asset ID of the shader source pair (vertex + fragment). */
  @serializable("string")
  declare public assetId: Exclude<keyof RegisteredAssets, number | symbol>;

  /** Display width in world units. */
  @serializable("float")
  declare public width: number;

  /** Display height in world units. */
  @serializable("float")
  declare public height: number;

  /** Anchor / pivot X (0-1, origin for rotation/scaling). */
  @serializable("float")
  declare public anchorX: number;

  /** Anchor / pivot Y (0-1, origin for rotation/scaling). */
  @serializable("float")
  declare public anchorY: number;

  /** Multiplicative color tint. */
  @serializable("json")
  declare public tint: Color;

  /** Whether to pass `performance.now()` to the shader `uTime` uniform. */
  @serializable("boolean")
  declare public useTime: boolean;

  /** Z-order for sorting within a layer. */
  @serializable("float")
  declare public zOrder: number;

  /** Render layer for multi-pass rendering. */
  @serializable("float")
  declare public layer: number;

  constructor(
    assetId: Exclude<keyof RegisteredAssets, number | symbol>,
    width: number = 128,
    height: number = 128,
    anchorX: number = 0.5,
    anchorY: number = 0.5,
    tint: Color = new Color(1, 1, 1, 1),
    useTime: boolean = true,
    zOrder: number = 0,
    layer: number = 0,
  ) {
    super();
    this.assetId = assetId;
    this.width = width;
    this.height = height;
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.tint = tint;
    this.useTime = useTime;
    this.zOrder = zOrder;
    this.layer = layer;
  }
}