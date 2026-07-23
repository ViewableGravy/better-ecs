import { createProgramRegistry } from "@engine/render/renderers/webGL/registry/create";
import { createCircleProgram } from "@engine/render/renderers/webGL/registry/programs/circle";
import { createColorProgram } from "@engine/render/renderers/webGL/registry/programs/color";
import { createRoundedRectangleProgram } from "@engine/render/renderers/webGL/registry/programs/rounded-rectangle";
import { createRetainedSpriteProgram } from "@engine/render/renderers/webGL/registry/programs/retained-sprite";
import { createSpriteProgram } from "@engine/render/renderers/webGL/registry/programs/sprite";

export const registry = createProgramRegistry({
  color: createColorProgram,
  circle: createCircleProgram,
  roundedRectangle: createRoundedRectangleProgram,
  retainedSprite: createRetainedSpriteProgram,
  sprite: createSpriteProgram,
});

export type WebGLProgramRegistry = typeof registry;
