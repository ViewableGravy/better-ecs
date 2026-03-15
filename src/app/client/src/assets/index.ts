import { transportBeltSheet } from "@client/assets/conveyor";
import { ironGearSheet } from "@client/assets/iron-gear";
import { ironOreSheet } from "@client/assets/iron-ore";
import { landClaimViewableGravyNameplateTexturePath } from "@client/assets/land-claim";
import { playerIdleSheet, playerMovingSheet } from "@client/assets/player";
import {
    wallEndingLeftSheet,
    wallEndingRightSheet,
    wallHorizontalSheet,
    wallSingleSheet
} from "@client/assets/wall";
import { createAssetLoader, createLoadShaderSource, createLoadTexture } from "@engine/asset";

const demoShaderVertexPath = new URL("./shaders/editor-quad.vert", import.meta.url).href;
const demoShaderFragmentPath = new URL("./shaders/editor-quad.frag", import.meta.url).href;

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
    demoShaderVertexPath, 
    demoShaderFragmentPath
  ),
});
