import { transportBeltSheet } from "@legacy/assets/conveyor";
import { ironGearSheet } from "@legacy/assets/iron-gear";
import { ironOreSheet } from "@legacy/assets/iron-ore";
import { landClaimViewableGravyNameplateTexturePath } from "@legacy/assets/land-claim";
import { playerIdleSheet, playerMovingSheet } from "@legacy/assets/player";
import demoShaderFragment from "@legacy/assets/shaders/editor-quad.frag";
import demoShaderVertex from "@legacy/assets/shaders/editor-quad.vert";
import {
    wallEndingLeftSheet,
    wallEndingRightSheet,
    wallHorizontalSheet,
    wallSingleSheet
} from "@legacy/assets/wall";
import { createAssetLoader, createLoadShaderSource, createLoadTexture } from "@engine/asset";

export const Loader = createAssetLoader({
  "player-idle": playerIdleSheet,
  "player-moving": playerMovingSheet,
  "iron-gear": ironGearSheet,
  "iron-ore": ironOreSheet,
  "transport-belt": transportBeltSheet,
  "wall-single": wallSingleSheet,
  "wall-ending-left": wallEndingLeftSheet,
  "wall-ending-right": wallEndingRightSheet,
  "wall-horizontal": wallHorizontalSheet,
  "land-claim:viewable-gravy-nameplate": createLoadTexture(landClaimViewableGravyNameplateTexturePath),
  "editor:demo-quad-shader": createLoadShaderSource(
    demoShaderVertex,
    demoShaderFragment,
  ),
});
