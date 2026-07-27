import { transportBeltSheet } from "@client/assets/conveyor";
import { playerIdleSheet, playerMovingSheet } from "@client/assets/player";
import { createAssetLoader } from "@engine/asset";

export const Loader = createAssetLoader({
  "player-idle": playerIdleSheet,
  "player-moving": playerMovingSheet,
  "transport-belt": transportBeltSheet,
});
