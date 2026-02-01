export type ProjectionType = "orthographic" | "perspective";

export class Camera {
  /** Projection type */
  public projection: ProjectionType;
  
  /** Half-height in world units (orthographic) */
  public orthoSize: number;
  
  /** Field of view in degrees (perspective) */
  public fov: number;
  
  /** Near clipping plane */
  public near: number;
  
  /** Far clipping plane */
  public far: number;
  
  /** Viewport position X (normalized 0-1) */
  public viewportX: number;
  
  /** Viewport position Y (normalized 0-1) */
  public viewportY: number;
  
  /** Viewport width (normalized 0-1) */
  public viewportWidth: number;
  
  /** Viewport height (normalized 0-1) */
  public viewportHeight: number;
  
  /** Whether this camera is enabled */
  public enabled: boolean;

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
    enabled: boolean = true
  ) {
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
  }
}
