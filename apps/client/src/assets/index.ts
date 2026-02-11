import PlayerSprite from "@/assets/sprites/player.png";
import { createAssetLoader, createLoadImage } from "@repo/engine/asset";

export const Loader = createAssetLoader({
  "player-sprite": createLoadImage(PlayerSprite),
});
