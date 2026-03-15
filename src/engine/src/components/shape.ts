import { Color } from "@engine/components/sprite/sprite";
import { Component } from "@engine/ecs/component";
import { SerializableComponent, serializable } from "@engine/serialization";

export type ShapeType = "rectangle" | "circle" | "line";

/**
 * Simple shape component for rendering basic shapes without textures.
 * Useful for prototyping, debugging, and simple games.
 */
@SerializableComponent
export class Shape extends Component {
  /** Type of shape to render */
  @serializable("string")
  declare public type: ShapeType;
  
  /** Width (for rectangle) or radius (for circle) */
  @serializable("float")
  declare public width: number;
  
  /** Height (for rectangle, ignored for circle) */
  @serializable("float")
  declare public height: number;
  
  /** Fill color */
  @serializable("json")
  declare public fill: Color;
  
  /** Stroke color (null = no stroke) */
  @serializable("json")
  declare public stroke: Color | null;
  
  /** Stroke width in pixels */
  @serializable("float")
  declare public strokeWidth: number;
  
  /** Z-order for sorting */
  @serializable("float")
  declare public zOrder: number;
  
  /** Render layer */
  @serializable("float")
  declare public layer: number;

  constructor(
    type: ShapeType = "rectangle",
    width: number = 10,
    height: number = 10,
    fill: Color = new Color(1, 1, 1, 1),
    stroke: Color | null = null,
    strokeWidth: number = 1,
    zOrder: number = 0,
    layer: number = 0
  ) {
    super();
    this.type = type;
    this.width = width;
    this.height = height;
    this.fill = fill;
    this.stroke = stroke;
    this.strokeWidth = strokeWidth;
    this.zOrder = zOrder;
    this.layer = layer;
  }
}
