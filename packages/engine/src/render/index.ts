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
    TextureStatus
} from "./types/renderer";

export { DEFAULT_RENDERER_CONFIG } from "./types/renderer";
export type { Renderer } from "./types/renderer";

// ── Low / High level interfaces ─────────────────────────────────
export type { HighLevelRenderer } from "./types/high-level";
export type { LowLevelRenderer } from "./types/low-level";

// ── Canvas 2D implementation ────────────────────────────────────
export { Canvas2DRenderer } from "./renderers/canvas2d/canvas2d-renderer";

// ── Texture cache ───────────────────────────────────────────────
export { TextureCache } from "./textureCache/texture-cache";

// ── Render queue ────────────────────────────────────────────────
export { RenderQueue } from "./queue/render-queue";

// ── Frame allocator ─────────────────────────────────────────────
export { FrameAllocator } from "./frame-allocator/frame-allocator";
export { InternalFrameAllocator } from "./frame-allocator/internal-frame-allocator";
export { engineFrameAllocatorRegistry } from "./frame-allocator/engine-registry";
export type {
  EngineFrameAllocatorRegistry,
} from "./frame-allocator/engine-registry";
export type {
  FrameAllocatorRegistry,
  FramePoolFactory,
  MergeFrameAllocatorRegistry,
} from "./frame-allocator/types";

