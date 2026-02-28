// ── Public types ─────────────────────────────────────────────────
export type {
    Renderable,
    RendererConfig, Settable, ShaderQuadOptions, ShapeRenderData,
    SpriteRenderData, TextureCacheConfig,
    TextureHandle,
    TextureInfo,
    TextureState,
    TextureStatus, TexturedQuadDrawData,
    TexturedQuadRenderData
} from "@render/types/renderer";

export { DEFAULT_RENDERER_CONFIG } from "@render/types/renderer";
export type { Renderer } from "@render/types/renderer";
export type { RendererAPI } from "@render/types/renderer-api";

// ── Render layers ───────────────────────────────────────────────
export { RenderCommand } from "@render/render-command";
export { Renderer2D } from "@render/renderers/renderer2d";

// ── Renderer API backends ───────────────────────────────────────
export { Canvas2DRenderAPI } from "@render/renderers/canvas2d/canvas2d-renderer-api";
export { WebGLRenderAPI } from "@render/renderers/webGL/api";

// ── Texture cache ───────────────────────────────────────────────
export { TextureCache } from "@render/textureCache/texture-cache";

// ── Render queue ────────────────────────────────────────────────
export { RenderQueue } from "@render/queue/render-queue";

// ── Frame allocator ─────────────────────────────────────────────
export { engineFrameAllocatorRegistry } from "@render/frame-allocator/engine-registry";
export type {
    EngineFrameAllocatorRegistry
} from "@render/frame-allocator/engine-registry";
export { FrameAllocator } from "@render/frame-allocator/frame-allocator";
export { InternalFrameAllocator } from "@render/frame-allocator/internal-frame-allocator";
export type {
    FrameAllocatorRegistry,
    FramePoolFactory,
    MergeFrameAllocatorRegistry
} from "@render/frame-allocator/types";

