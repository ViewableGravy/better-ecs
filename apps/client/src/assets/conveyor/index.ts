import TransportBeltSprite from "@/assets/conveyor/transport-belt.png";
import { createLoadSheet } from "@repo/engine/asset";

const TRANSPORT_BELT_FRAME_SIZE = 128;
const TRANSPORT_BELT_FRAME_COUNT = 16;

export const TRANSPORT_BELT_VARIANTS = [
  "horizontal-right",
  "horizontal-left",
  "vertical-up",
  "vertical-down",
  "angled-right-up",
  "angled-up-right",
  "angled-left-up",
  "angled-top-left",
  "angled-bottom-right",
  "angled-right-bottom",
  "angled-bottom-left",
  "angled-left-bottom",
  "start-bottom",
  "end-bottom",
  "start-left",
  "end-left",
  "start-top",
  "end-top",
  "start-right",
  "end-right",
] as const;

export type TransportBeltVariant = (typeof TRANSPORT_BELT_VARIANTS)[number];

const TRANSPORT_BELT_VARIANT_ROW_BY_NAME: Record<TransportBeltVariant, number> = {
  "horizontal-right": 0,
  "horizontal-left": 1,
  "vertical-up": 2,
  "vertical-down": 3,
  "angled-right-up": 4,
  "angled-up-right": 5,
  "angled-left-up": 6,
  "angled-top-left": 7,
  "angled-bottom-right": 8,
  "angled-right-bottom": 9,
  "angled-bottom-left": 10,
  "angled-left-bottom": 11,
  "start-bottom": 12,
  "end-bottom": 13,
  "start-left": 14,
  "end-left": 15,
  "start-top": 16,
  "end-top": 17,
  "start-right": 18,
  "end-right": 19,
};

function createTransportBeltSprites() {
  const sprites: Record<string, { x: number; y: number; w: number; h: number }> = {};

  for (const variant of TRANSPORT_BELT_VARIANTS) {
    const rowIndex = TRANSPORT_BELT_VARIANT_ROW_BY_NAME[variant];

    for (let frame = 1; frame <= TRANSPORT_BELT_FRAME_COUNT; frame += 1) {
      const frameIndex = frame - 1;
      sprites[`${variant}_${frame}`] = {
        x: frameIndex * TRANSPORT_BELT_FRAME_SIZE,
        y: rowIndex * TRANSPORT_BELT_FRAME_SIZE,
        w: TRANSPORT_BELT_FRAME_SIZE,
        h: TRANSPORT_BELT_FRAME_SIZE,
      };
    }
  }

  return sprites;
}

export const transportBeltSheet = createLoadSheet(TransportBeltSprite)({
  sprites: createTransportBeltSprites(),
});

export function getTransportBeltAnimationAssets(variant: TransportBeltVariant): string[] {
  const assets: string[] = [];

  for (let frame = 1; frame <= TRANSPORT_BELT_FRAME_COUNT; frame += 1) {
    assets.push(`transport-belt:${variant}_${frame}`);
  }

  return assets;
}

export function getAllTransportBeltAssetIds(): string[] {
  const assets: string[] = [];

  for (const variant of TRANSPORT_BELT_VARIANTS) {
    for (let frame = 1; frame <= TRANSPORT_BELT_FRAME_COUNT; frame += 1) {
      assets.push(`transport-belt:${variant}_${frame}`);
    }
  }

  return assets;
}
