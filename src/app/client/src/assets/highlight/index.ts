import HighlightSprite from "@client/assets/highlight/cursor-boxes.png";
import { createLoadSheet } from "@engine/asset";

export const highlightSheet = createLoadSheet(HighlightSprite)({
  sprites: {
    yellow: { x: 0, y: 0, w: 64, h: 64 },
  },
});
