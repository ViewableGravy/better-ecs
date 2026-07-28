import { setupContextCamera } from "@legacy/scenes/world/contexts/shared";
import {
  BELT_STRESS_ITEM_COUNTS,
  DEFAULT_BELT_STRESS_ITEM_COUNT,
  requireBeltStressItemCount,
} from "@legacy/scenes/belt-stress/config";
import { BeltStressController } from "@legacy/scenes/belt-stress/controller";
import { mountBeltStressControls } from "@legacy/scenes/belt-stress/controls";
import type { BeltStressHarness } from "@legacy/scenes/belt-stress/types";
import { createScene } from "@engine";
import { Texture } from "@engine/components";
import { ActiveRegistry, Engine, FromEngine, fromContext } from "@engine/context";

const BELT_FRAME_NAMES = [
  "horizontal-right_1", "horizontal-right_2", "horizontal-right_3", "horizontal-right_4",
  "horizontal-right_5", "horizontal-right_6", "horizontal-right_7", "horizontal-right_8",
  "horizontal-right_9", "horizontal-right_10", "horizontal-right_11", "horizontal-right_12",
  "horizontal-right_13", "horizontal-right_14", "horizontal-right_15", "horizontal-right_16",
] as const;

declare global {
  interface Window {
    __BELT_STRESS_BENCH__?: BeltStressHarness;
  }
}

let disposeScene: () => void = () => undefined;

export const Scene = createScene("BeltStressScene")({
  async setup() {
    const registry = fromContext(ActiveRegistry);
    const engine = fromContext(Engine);
    const assets = fromContext(FromEngine.Assets);
    setupContextCamera(registry);

    await Promise.all([
      assets.loadSheet("transport-belt"),
      assets.loadSheet("iron-gear"),
    ]);

    const beltFrames = BELT_FRAME_NAMES.map((frame) => (
      requireTexture(assets.getFromSheetStrict("transport-belt", frame))
    ));
    const itemTexture = requireTexture(assets.getFromSheetStrict("iron-gear", "small"));
    const controller = new BeltStressController(readInitialTarget(), {
      beltImage: beltFrames[0].source.resource,
      beltFrameUvRects: createFrameUvRects(
        beltFrames,
      ),
      itemImage: itemTexture.source.resource,
      itemUvRect: createFrameUvRects([itemTexture]),
    });
    const unmountControls = mountBeltStressControls(controller, engine);

    window.__BELT_STRESS_BENCH__ = {
      targets: BELT_STRESS_ITEM_COUNTS,
      configure: (itemCount) => controller.configure(itemCount),
      status: () => controller.status(),
    };
    disposeScene = () => {
      unmountControls();
      controller.dispose();
      delete window.__BELT_STRESS_BENCH__;
    };
    controller.configure(readInitialTarget());
  },
  teardown() {
    disposeScene();
    disposeScene = () => undefined;
  },
});

function createFrameUvRects(textures: readonly Texture[]): Float32Array {
  const uvRects = new Float32Array(textures.length * 4);
  for (let index = 0; index < textures.length; index += 1) {
    const texture = textures[index];
    if (!texture) {
      throw new Error(`Belt stress texture frame ${index} is missing.`);
    }

    writeFrameUvRect(uvRects, index * 4, texture);
  }
  return uvRects;
}

function requireTexture(value: unknown): Texture {
  if (!(value instanceof Texture)) {
    throw new Error("Belt stress demo requires texture sheet assets.");
  }

  return value;
}

function writeFrameUvRect(target: Float32Array, offset: number, texture: Texture): void {
  const width = texture.frameWidth || texture.source.width;
  const height = texture.frameHeight || texture.source.height;
  const insetX = width > 1 ? 0.5 : 0;
  const insetY = height > 1 ? 0.5 : 0;
  target[offset] = (texture.frameX + insetX) / texture.source.width;
  target[offset + 1] = (texture.frameY + insetY) / texture.source.height;
  target[offset + 2] = (texture.frameX + width - insetX) / texture.source.width;
  target[offset + 3] = (texture.frameY + height - insetY) / texture.source.height;
}

function readInitialTarget() {
  const value = new URLSearchParams(window.location.search).get("benchmarkTarget");
  return value === null ? DEFAULT_BELT_STRESS_ITEM_COUNT : requireBeltStressItemCount(Number(value));
}
