import IronGearSprite from "@client/assets/iron-gear/iron-gear-wheel.png";
import { createLoadSheet } from "@engine/asset";

export const GEAR_SIZE_VARIANTS = ["large", "medium", "small", "extra-small"] as const;

export type GearSizeVariant = (typeof GEAR_SIZE_VARIANTS)[number];
export type GearAssetId = `iron-gear:${GearSizeVariant}`;

export const ironGearSheet = createLoadSheet(IronGearSprite)({
  sprites: {
    large: { x: 0, y: 0, w: 64, h: 64 },
    medium: { x: 64, y: 0, w: 32, h: 32 },
    small: { x: 96, y: 0, w: 16, h: 16 },
    "extra-small": { x: 112, y: 0, w: 8, h: 8 },
  },
});

export function createGearAssetId(size: GearSizeVariant): GearAssetId {
  return `iron-gear:${size}`;
}

export function getAllGearAssetIds(): GearAssetId[] {
  return GEAR_SIZE_VARIANTS.map((size) => createGearAssetId(size));
}