import PlayerSprite from "@/assets/sprites/player.png";
import { createAssetLoader, createLoadTexture } from "@repo/engine/asset";

export const Loader = createAssetLoader({
  "player-sprite": createLoadTexture(PlayerSprite),
});
