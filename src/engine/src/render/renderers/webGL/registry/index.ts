import { createProgramRegistry } from "@engine/render/renderers/webGL/registry/create";
import { createCircleProgram } from "@engine/render/renderers/webGL/registry/programs/circle";
import { createColorProgram } from "@engine/render/renderers/webGL/registry/programs/color";
import { createRoundedRectangleProgram } from "@engine/render/renderers/webGL/registry/programs/rounded-rectangle";
import { createSpriteProgram } from "@engine/render/renderers/webGL/registry/programs/sprite";

export const registry = createProgramRegistry({
  color: createColorProgram,
  circle: createCircleProgram,
  roundedRectangle: createRoundedRectangleProgram,
  sprite: createSpriteProgram,
});

export type WebGLProgramRegistry = typeof registry;