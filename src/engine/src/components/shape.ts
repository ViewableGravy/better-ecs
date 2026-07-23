import { Component } from "@engine/ecs/component";

export type ShapeType = "rectangle" | "circle" | "line";

/**
 * Simple shape component for rendering basic shapes without textures.
 * Useful for prototyping, debugging, and simple games.
 */
export class Shape extends Component {
  /** Type of shape to render */
  declare public type: ShapeType;
  
  /** Width (for rectangle) or radius (for circle) */
  declare public width: number;
  
  /** Height (for rectangle, ignored for circle) */
  declare public height: number;
  
  /** Stroke width in pixels */
  declare public strokeWidth: number;
  
  /** Z-order for sorting */
  declare public zOrder: number;
  
  /** Render layer */
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
