import { woodenChestSheet } from "@client/assets/chest";
import { transportBeltSheet } from "@client/assets/conveyor";
import gridFragmentSource from "@client/assets/debug-grid/grid.frag";
import gridVertexSource from "@client/assets/debug-grid/grid.vert";
import { gridUniforms } from "@client/assets/debug-grid/types";
import { highlightSheet } from "@client/assets/highlight";
import { playerIdleSheet, playerMovingSheet } from "@client/assets/player";
import { createAssetLoader, createLoadShaderSource } from "@engine/asset";

export const Loader = createAssetLoader({
  "wooden-chest": woodenChestSheet,
  "player-idle": playerIdleSheet,
  "player-moving": playerMovingSheet,
  "transport-belt": transportBeltSheet,
  highlight: highlightSheet,
  "debug:grid": createLoadShaderSource(
    gridVertexSource,
    gridFragmentSource,
    gridUniforms,
  ),
});
