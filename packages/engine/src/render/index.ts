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
export type { RendererAPI } from "./types/renderer-api";

// ── Render layers ───────────────────────────────────────────────
export { RenderCommand } from "./render-command";
export { Renderer2D } from "./renderers/renderer2d";

// ── Renderer API backends ───────────────────────────────────────
export { Canvas2DRenderAPI } from "./renderers/canvas2d/canvas2d-renderer-api";
export { WebGLRenderAPI } from "./renderers/webGL/webgl-renderer-api";

// ── Texture cache ───────────────────────────────────────────────
export { TextureCache } from "./textureCache/texture-cache";

// ── Render queue ────────────────────────────────────────────────
export { RenderQueue } from "./queue/render-queue";

// ── Frame allocator ─────────────────────────────────────────────
export { engineFrameAllocatorRegistry } from "./frame-allocator/engine-registry";
export type {
    EngineFrameAllocatorRegistry
} from "./frame-allocator/engine-registry";
export { FrameAllocator } from "./frame-allocator/frame-allocator";
export { InternalFrameAllocator } from "./frame-allocator/internal-frame-allocator";
export type {
    FrameAllocatorRegistry,
    FramePoolFactory,
    MergeFrameAllocatorRegistry
} from "./frame-allocator/types";

