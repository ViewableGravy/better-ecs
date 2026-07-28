import WoodenChestSprite from "@client/assets/chest/wooden-chest.png";
import { createLoadSheet } from "@engine/asset";

export const woodenChestSheet = createLoadSheet(WoodenChestSprite)({
  sprites: {
    wooden: { x: 0, y: 0, w: 32, h: 36 },
  },
});
