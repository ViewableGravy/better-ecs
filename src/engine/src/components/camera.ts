import { Component } from "@engine/ecs/component";
import { StateComponent, state } from "@engine/serialization";

export type ProjectionType = "orthographic" | "perspective";

@StateComponent
export class Camera extends Component {
  /** Projection type */
  @state("string")
  declare public projection: ProjectionType;
  
  /** Half-height in world units (orthographic) */
  @state("float")
  declare public orthoSize: number;
  
  /** Field of view in degrees (perspective) */
  @state("float")
  declare public fov: number;
  
  /** Near clipping plane */
  @state("float")
  declare public near: number;
  
  /** Far clipping plane */
  @state("float")
  declare public far: number;
  
  /** Viewport position X (normalized 0-1) */
  @state("float")
  declare public viewportX: number;
  
  /** Viewport position Y (normalized 0-1) */
  @state("float")
  declare public viewportY: number;
  
  /** Viewport width (normalized 0-1) */
  @state("float")
  declare public viewportWidth: number;
  
  /** Viewport height (normalized 0-1) */
  @state("float")
  declare public viewportHeight: number;
  
  /** Whether this camera is enabled */
  @state("boolean")
  declare public enabled: boolean;

  /** Whether this is the primary scene camera */
  @state("boolean")
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
