import { ironOreSheet } from "@/assets/iron-ore";
import PlayerSprite from "@/assets/sprites/player.png";
import { createAssetLoader, createLoadShaderSource, createLoadTexture } from "@repo/engine/asset";

const demoShaderVertexPath = new URL("./shaders/editor-quad.vert", import.meta.url).href;
const demoShaderFragmentPath = new URL("./shaders/editor-quad.frag", import.meta.url).href;

export const Loader = createAssetLoader({
  "player-sprite": createLoadTexture(PlayerSprite),
  "iron-ore": ironOreSheet,
  "editor:demo-quad-shader": createLoadShaderSource(
    demoShaderVertexPath, 
    demoShaderFragmentPath
  ),
});
