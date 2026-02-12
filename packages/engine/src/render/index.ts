// ── Public types ─────────────────────────────────────────────────
export type {
  Renderable,
  RendererConfig,
  Settable,
  ShapeRenderData,
  SpriteRenderData,
  TextureCacheConfig,
  TextureHandle,
  TextureInfo,
  TextureState,
  TextureStatus,
} from "./renderer";

export { DEFAULT_RENDERER_CONFIG } from "./renderer";
export type { Renderer } from "./renderer";

// ── Low / High level interfaces ─────────────────────────────────
export type { HighLevelRenderer } from "./high-level";
export type { LowLevelRenderer } from "./low-level";

// ── Canvas 2D implementation ────────────────────────────────────
export { Canvas2DRenderer } from "./canvas2d-renderer";

// ── Texture cache ───────────────────────────────────────────────
export { TextureCache } from "./texture-cache";

// ── Render queue ────────────────────────────────────────────────
export { RenderQueue } from "./render-queue";
