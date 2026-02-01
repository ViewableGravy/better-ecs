import { Color } from "./sprite";

export type ShapeType = "rectangle" | "circle" | "line";

/**
 * Simple shape component for rendering basic shapes without textures.
 * Useful for prototyping, debugging, and simple games.
 */
export class Shape {
  /** Type of shape to render */
  public type: ShapeType;
  
  /** Width (for rectangle) or radius (for circle) */
  public width: number;
  
  /** Height (for rectangle, ignored for circle) */
  public height: number;
  
  /** Fill color */
  public fill: Color;
  
  /** Stroke color (null = no stroke) */
  public stroke: Color | null;
  
  /** Stroke width in pixels */
  public strokeWidth: number;
  
  /** Z-order for sorting */
  public zOrder: number;
  
  /** Render layer */
  public layer: number;

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
