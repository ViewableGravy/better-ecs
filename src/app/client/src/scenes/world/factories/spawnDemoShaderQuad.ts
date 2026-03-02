import { RENDER_LAYERS } from "@client/consts";
import type { UserWorld } from "@engine";
import { Debug, ShaderQuad, Transform2D } from "@engine/components";
import { OUTSIDE, RenderVisibility } from "@client/scenes/world/components/render-visibility";

type SpawnDemoShaderQuadOptions = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export function spawnDemoShaderQuad(world: UserWorld, options: SpawnDemoShaderQuadOptions): number {
  const entity = world.create();

  const shaderQuad = new ShaderQuad(
    "editor:demo-quad-shader",
    options.width ?? 96,
    options.height ?? 96,
  );

  shaderQuad.layer = RENDER_LAYERS.world;

  world.add(entity, new Transform2D(options.x, options.y));
  world.add(entity, shaderQuad);
  world.add(entity, new RenderVisibility(OUTSIDE, 1));
  world.add(entity, new Debug("shader-quad"));

  return entity;
}