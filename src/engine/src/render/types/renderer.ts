import type { ShaderSourceAsset, ShaderUniforms } from "@engine/asset";
import type { LooseAssetManager } from "@engine/asset/AssetManager";
import type { Camera } from "@engine/components/camera";
import type { Shape } from "@engine/components/shape";
import type { Rgba, Sprite } from "@engine/components/sprite/sprite";
import type { Text } from "@engine/components/text";
import type { Texture } from "@engine/components/texture";
import type { ShaderTransform2D, Transform2D } from "@engine/components/transform";
import type { RegisteredAssets } from "@engine/core";
import type { InstancedBucket, InstancedBucketDescriptor, InstancedDrawCamera } from "@engine/render/renderers/webGL/instanced-bucket";
import type { TextureCache, TextureCacheConfig } from "@engine/render/textureCache/texture-cache";
import type { ShapeRenderInput, TextRenderData } from "@engine/render/types/low-level";

export { type TextureCacheConfig } from "@engine/render/textureCache/texture-cache";
export type { TextureHandle, TextureInfo, TextureState, TextureStatus } from "@engine/render/textureCache/texture-cache";
export type {
    DenseShapeRenderData,
    ShapeRenderData,
    ShapeRenderInput,
    SpriteRenderData, TextRenderData,
    TexturedQuadRenderData
} from "@engine/render/types/low-level";

export type Renderable = Sprite | Shape | Text;
export type Settable = Camera;

export type SpriteAnimationRenderState = {
  frameAssetIds: readonly string[];
  playbackRate: number;
  startTick: number;
};

export type SpriteRenderState = {
  assetId: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  flipX: boolean;
  flipY: boolean;
  layer: number;
  zOrder: number;
  tint: Rgba;
  animation?: SpriteAnimationRenderState;
};

export interface ShaderQuadOptions {
  texture?: Texture;
  tint?: Rgba;
  time?: number;
}

type ShaderAssetKey<TAssets extends Record<string, unknown>> = {
  [TKey in keyof TAssets]: TAssets[TKey] extends ShaderSourceAsset ? TKey : never;
}[keyof TAssets] & string;

type ShaderDrawDataForKey<
  TAssets extends Record<string, unknown>,
  TKey extends ShaderAssetKey<TAssets>,
> = TAssets[TKey] extends ShaderSourceAsset<infer TUniforms extends ShaderUniforms>
  ? { name: TKey; uniforms: TUniforms }
  : never;

export type ShaderDrawData<TAssets extends Record<string, unknown> = RegisteredAssets> =
  [ShaderAssetKey<TAssets>] extends [never]
    ? { name: string; uniforms: ShaderUniforms }
    : {
        [TKey in ShaderAssetKey<TAssets>]: ShaderDrawDataForKey<TAssets, TKey>;
      }[ShaderAssetKey<TAssets>];

export interface TexturedQuadDrawData {
  shader: ShaderSourceAsset;
  texture?: Texture;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  anchorX: number;
  anchorY: number;
  tint?: Rgba;
  time: number;
}

/**
 * Configuration for renderer behavior — combines cache and 2D renderer
 * config into a single flat options object.
 */
export type RendererConfig = TextureCacheConfig & {
  showFallback: boolean;
};

const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  textureUploadBudget: 4,
  showFallback: true,
  warnOnLazyLoad: true,
};

export { DEFAULT_RENDERER_CONFIG };

/**
 * Renderer2D-facing composite renderer — the entry point for all rendering.
 *
 * Layering:
 *   - `RendererAPI`   — low-level WebGL implementation
 *   - `RenderCommand` — thin command facade over RendererAPI
 *   - `Renderer`      — 2D orchestration (camera, texture cache, renderables)
 */
export interface Renderer {
  initialize(canvas: HTMLCanvasElement, assets: LooseAssetManager): Promise<void>;
  warmupLoadedTextures(): Promise<void>;

  begin(): void;
  end(): void;
  clear(color: Rgba): void;

  render(renderable: Renderable, transform: Transform2D, alpha: number): void;
  renderSprite(sprite: SpriteRenderState, transform: Transform2D, alpha: number): void;
  upsertRetainedSprite(
    bucketId: number,
    instanceId: number,
    sprite: SpriteRenderState,
    transform: Transform2D,
  ): boolean;
  removeRetainedSprite(bucketId: number, instanceId: number): void;
  drawRetainedSpriteBucket(bucketId: number, interpolationAlpha: number, updateTick: number): void;
  releaseRetainedSpriteBucket(bucketId: number): void;
  set(value: Settable, transform: Transform2D, alpha: number): void;

  drawShape(data: ShapeRenderInput): void;
  drawText(data: TextRenderData): void;
  drawTexturedQuad(data: TexturedQuadDrawData): void;
  drawShaderQuad(shader: ShaderSourceAsset, transform: ShaderTransform2D, options?: ShaderQuadOptions): void;
  drawShader(data: ShaderDrawData): void;

  createInstancedBucket(descriptor: InstancedBucketDescriptor): InstancedBucket;
  drawInstancedBucket(bucket: InstancedBucket): void;
  drawInstancedBucket(bucket: InstancedBucket, camera: InstancedDrawCamera, extra?: Record<string, number | Iterable<number>>): void;

  setCamera(x: number, y: number, zoom: number): void;
  setMeshOverlayEnabled(enabled: boolean): void;
  getCameraX(): number;
  getCameraY(): number;
  getCameraZoom(): number;

  getWidth(): number;
  getHeight(): number;

  readonly cache: TextureCache;
  readonly config: RendererConfig;
}
