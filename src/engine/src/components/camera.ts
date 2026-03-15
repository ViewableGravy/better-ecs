import { Component } from "@engine/ecs/component";
import { SerializableComponent, serializable } from "@engine/serialization";

export type ProjectionType = "orthographic" | "perspective";

@SerializableComponent
export class Camera extends Component {
  /** Projection type */
  @serializable("string")
  declare public projection: ProjectionType;
  
  /** Half-height in world units (orthographic) */
  @serializable("float")
  declare public orthoSize: number;
  
  /** Field of view in degrees (perspective) */
  @serializable("float")
  declare public fov: number;
  
  /** Near clipping plane */
  @serializable("float")
  declare public near: number;
  
  /** Far clipping plane */
  @serializable("float")
  declare public far: number;
  
  /** Viewport position X (normalized 0-1) */
  @serializable("float")
  declare public viewportX: number;
  
  /** Viewport position Y (normalized 0-1) */
  @serializable("float")
  declare public viewportY: number;
  
  /** Viewport width (normalized 0-1) */
  @serializable("float")
  declare public viewportWidth: number;
  
  /** Viewport height (normalized 0-1) */
  @serializable("float")
  declare public viewportHeight: number;
  
  /** Whether this camera is enabled */
  @serializable("boolean")
  declare public enabled: boolean;

  /** Whether this is the primary scene camera */
  @serializable("boolean")
  declare public primary: boolean;

  constructor(
    projection: ProjectionType = "orthographic",
    orthoSize: number = 10,
    fov: number = 60,
    near: number = 0.1,
    far: number = 1000,
    viewportX: number = 0,
    viewportY: number = 0,
    viewportWidth: number = 1,
    viewportHeight: number = 1,
    enabled: boolean = true,
    primary: boolean = false,
  ) {
    super();
    this.projection = projection;
    this.orthoSize = orthoSize;
    this.fov = fov;
    this.near = near;
    this.far = far;
    this.viewportX = viewportX;
    this.viewportY = viewportY;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.enabled = enabled;
    this.primary = primary;
  }
}
