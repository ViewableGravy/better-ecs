// ── Public types ─────────────────────────────────────────────────
export type {
    DenseShapeRenderData,
    Renderable,
    RendererConfig, Settable, ShaderQuadOptions, ShapeRenderData,
    ShapeRenderInput,
    SpriteRenderData, TextureCacheConfig,
    TextureHandle,
    TextureInfo,
    TextureState,
    TextureStatus, TexturedQuadDrawData,
    TexturedQuadRenderData
} from "@engine/render/types/renderer";

export { DEFAULT_RENDERER_CONFIG } from "@engine/render/types/renderer";
export type { Renderer } from "@engine/render/types/renderer";
export type { RendererAPI } from "@engine/render/types/renderer-api";

// ── Render layers ───────────────────────────────────────────────
export { RenderCommand } from "@engine/render/render-command";
export { Renderer2D } from "@engine/render/renderers/renderer2d";

// ── Renderer API backends ───────────────────────────────────────
export { Canvas2DRenderAPI } from "@engine/render/renderers/canvas2d/canvas2d-renderer-api";
export { WebGLRenderAPI } from "@engine/render/renderers/webGL/api";

// ── Texture cache ───────────────────────────────────────────────
export { TextureCache } from "@engine/render/textureCache/texture-cache";

// ── Render queue ────────────────────────────────────────────────
export { RenderQueue } from "@engine/render/queue/render-queue";

// ── Frame allocator ─────────────────────────────────────────────
export { engineFrameAllocatorRegistry } from "@engine/render/frame-allocator/engine-registry";
export type {
    EngineFrameAllocatorRegistry
} from "@engine/render/frame-allocator/engine-registry";
export { FrameAllocator } from "@engine/render/frame-allocator/frame-allocator";
export { InternalFrameAllocator } from "@engine/render/frame-allocator/internal-frame-allocator";
export type {
    FrameAllocatorRegistry,
    FramePoolFactory,
    MergeFrameAllocatorRegistry
} from "@engine/render/frame-allocator/types";

