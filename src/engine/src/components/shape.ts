import { Component } from "@engine/ecs/component";
import { StateComponent, state } from "@engine/serialization";

export type ShapeType = "rectangle" | "circle" | "line";

/**
 * Simple shape component for rendering basic shapes without textures.
 * Useful for prototyping, debugging, and simple games.
 */
@StateComponent
export class Shape extends Component {
  /** Type of shape to render */
  @state("string")
  declare public type: ShapeType;
  
  /** Width (for rectangle) or radius (for circle) */
  @state("float")
  declare public width: number;
  
  /** Height (for rectangle, ignored for circle) */
  @state("float")
  declare public height: number;
  
  /** Stroke width in pixels */
  @state("float")
  declare public strokeWidth: number;
  
  /** Z-order for sorting */
  @state("float")
  declare public zOrder: number;
  
  /** Render layer */
  @state("float")
  declare public layer: number;

  constructor(
    type: ShapeType = "rectangle",
    width: number = 10,
    height: number = 10,
    strokeWidth: number = 1,
    zOrder: number = 0,
    layer: number = 0
  ) {
    super();
    this.type = type;
    this.width = width;
    this.height = height;
    this.strokeWidth = strokeWidth;
    this.zOrder = zOrder;
    this.layer = layer;
  }
}
