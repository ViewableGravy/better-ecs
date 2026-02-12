import type { Camera } from "../components/camera";
import type { Shape } from "../components/shape";
import type { Color, Sprite } from "../components/sprite";
import type { Transform2D } from "../components/transform/transform2d";
import type { TextureCache } from "./texture-cache";

/**
 * Settable values for the high-level renderer.
 * Using `set()` with a component class instance configures the
 * renderer state for subsequent draw calls.
 */
export type Settable = Camera;

/**
 * Renderable component instances.
 * Using `render()` with one of these + a transform will draw the
 * entity using the appropriate backend path (sprite, shape, etc.).
 */
export type Renderable = Sprite | Shape;

/**
 * High-level renderer interface — the primary API for game systems.
 *
 * Provides a simplified surface area:
 *   - `begin` / `end` — frame lifecycle
 *   - `clear`         — clear the viewport
 *   - `render`        — polymorphic draw (accepts Sprite or Shape)
 *   - `set`           — configure state (accepts Camera)
 *   - `cache`         — access the texture cache (preload, evict, etc.)
 *
 * Internally delegates to a LowLevelRenderer for actual draw calls.
 */
export interface HighLevelRenderer {
  // ── Frame lifecycle ────────────────────────────────────────────

  /** Begin a new frame. Resets per-frame budgets, clears transforms. */
  begin(): void;

  /** End the current frame. */
  end(): void;

  /** Clear the viewport with a solid color. */
  clear(color: Color): void;

  // ── Rendering ──────────────────────────────────────────────────

  /**
   * Render a component.
   *
   * Accepts a Sprite or Shape together with a Transform2D and an
   * interpolation alpha. Internally resolves textures, builds draw
   * data, and delegates to the low-level renderer.
   */
  render(renderable: Renderable, transform: Transform2D, alpha: number): void;

  // ── State configuration ────────────────────────────────────────

  /**
   * Configure renderer state from a component instance.
   *
   * Currently supports:
   *   - `Camera` — sets the camera position and zoom.
   */
  set(value: Settable, transform: Transform2D, alpha: number): void;

  // ── Texture cache ──────────────────────────────────────────────

  /** Access the texture cache for preload / eviction. */
  readonly cache: TextureCache;

  // ── Viewport queries ───────────────────────────────────────────

  /** Canvas width in pixels. */
  getWidth(): number;

  /** Canvas height in pixels. */
  getHeight(): number;
}
