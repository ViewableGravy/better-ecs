import { createAssetLoader, createLoadImage } from "@repo/engine/asset";

export const Loader = createAssetLoader({
  "player-sprite": createLoadImage("/sprites/player.png"),
});
