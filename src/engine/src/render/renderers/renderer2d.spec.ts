import { describe, expect, it, vi } from "vitest";

import type { LooseAssetManager } from "@engine/asset/AssetManager";
import { Sprite } from "@engine/components/sprite/sprite";
import { Texture } from "@engine/components/texture";
import { Transform2D } from "@engine/components/transform";
import { Renderer2D } from "@engine/render/renderers/renderer2d";
import { WebGLRetainedSpriteBatcher } from "@engine/render/renderers/webGL/retained-sprite-batcher";
import { DEFAULT_RENDERER_CONFIG } from "@engine/render/types/renderer";
import type { RendererAPI } from "@engine/render/types/renderer-api";

describe("Renderer2D", () => {
  it("preserves immediate Sprite rendering for callers outside the ECS retained path", async () => {
    // Renderer2D only reads the image dimensions and forwards the resource, so a DOM-backed image is unnecessary here.
    const image = { width: 128, height: 64 } as HTMLImageElement;
    const texture = new Texture(image, 8, 16, 32, 24);
    const assets = createAssets(texture);
    const drawSprite = vi.fn<RendererAPI["drawSprite"]>();
    const rendererApi = createRendererApi(drawSprite);
    const renderer = new Renderer2D(rendererApi, {
      ...DEFAULT_RENDERER_CONFIG,
      showFallback: false,
      textureUploadBudget: 0,
      warnOnLazyLoad: false,
    });

    // The low-level renderer test double does not inspect or retain the canvas.
    await renderer.initialize({} as HTMLCanvasElement, assets);

    const sprite = new Sprite("test", 0, 0, 0.25, 0.75, true, false);
    const transform = new Transform2D(30, 60, Math.PI / 4, -2, 3);
    transform.prev.pos.set(10, 20);

    renderer.render(sprite, transform, 0.25);

    expect(drawSprite).toHaveBeenCalledOnce();
    expect(drawSprite.mock.calls[0]?.[0]).toMatchObject({
      image,
      x: 15,
      y: 30,
      width: 32,
      height: 24,
      rotation: Math.PI / 4,
      scaleX: -2,
      scaleY: 3,
      anchorX: 0.25,
      anchorY: 0.75,
      sourceX: 8,
      sourceY: 16,
      sourceWidth: 32,
      sourceHeight: 24,
      flipX: true,
      flipY: false,
      tint: {
        r: 1,
        g: 1,
        b: 1,
        a: 1,
      },
    });
  });
});

function createAssets(texture: Texture): LooseAssetManager {
  return {
    getLoose: (path) => path === "test" ? texture : undefined,
    loadLoose: async (path) => path === "test" ? texture : undefined,
    getLoadedByType: () => [],
  };
}

function createRendererApi(drawSprite: RendererAPI["drawSprite"]): RendererAPI {
  return {
    retainedSpriteBatcher: new WebGLRetainedSpriteBatcher(() => undefined),
    initialize: () => undefined,
    preloadTextures: () => undefined,
    beginFrame: () => undefined,
    endFrame: () => undefined,
    clear: () => undefined,
    setCamera: () => undefined,
    setMeshOverlayEnabled: () => undefined,
    getCameraX: () => 0,
    getCameraY: () => 0,
    getCameraZoom: () => 1,
    drawSprite,
    drawTexturedQuad: () => undefined,
    drawShape: () => undefined,
    getWidth: () => 1280,
    getHeight: () => 720,
  };
}
