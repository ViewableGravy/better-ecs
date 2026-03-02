import { transportBeltSheet } from "@client/assets/conveyor";
import { ironOreSheet } from "@client/assets/iron-ore";
import PlayerSprite from "@client/assets/sprites/player.png";
import { createAssetLoader, createLoadShaderSource, createLoadTexture } from "@engine/asset";

const demoShaderVertexPath = new URL("./shaders/editor-quad.vert", import.meta.url).href;
const demoShaderFragmentPath = new URL("./shaders/editor-quad.frag", import.meta.url).href;

export const Loader = createAssetLoader({
  "player-sprite": createLoadTexture(PlayerSprite),
  "iron-ore": ironOreSheet,
  "transport-belt": transportBeltSheet,
  "editor:demo-quad-shader": createLoadShaderSource(
    demoShaderVertexPath, 
    demoShaderFragmentPath
  ),
});
