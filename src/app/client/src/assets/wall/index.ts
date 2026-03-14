import WallEndingLeftSprite from "@client/assets/wall/wall-ending-left.png";
import WallEndingRightSprite from "@client/assets/wall/wall-ending-right.png";
import WallHorizontalSprite from "@client/assets/wall/wall-horizontal.png";
import WallSingleSprite from "@client/assets/wall/wall-single.png";
import { createLoadSheet } from "@engine/asset";

export const wallSingleSheet = createLoadSheet(WallSingleSprite)({
  sprites: {
    "1": { x: 0, y: 0, w: 64, h: 86 },
    "2": { x: 64, y: 0, w: 64, h: 86 },
  },
});

export const wallEndingLeftSheet = createLoadSheet(WallEndingLeftSprite)({
  sprites: {
    "1": { x: 0, y: 0, w: 64, h: 92 },
    "2": { x: 64, y: 0, w: 64, h: 92 },
  },
});

export const wallEndingRightSheet = createLoadSheet(WallEndingRightSprite)({
  sprites: {
    "1": { x: 0, y: 0, w: 64, h: 92 },
    "2": { x: 64, y: 0, w: 64, h: 92 },
  },
});

export const wallHorizontalSheet = createLoadSheet(WallHorizontalSprite)({
  sprites: {
    "1": { x: 0, y: 0, w: 64, h: 92 },
    "2": { x: 64, y: 0, w: 64, h: 92 },
    "3": { x: 128, y: 0, w: 64, h: 92 },
    "4": { x: 192, y: 0, w: 64, h: 92 },
    "5": { x: 256, y: 0, w: 64, h: 92 },
    "6": { x: 320, y: 0, w: 64, h: 92 },
  },
});