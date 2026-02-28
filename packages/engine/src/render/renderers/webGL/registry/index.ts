import { createProgramRegistry } from "@render/renderers/webGL/registry/create";
import { createCircleProgram } from "@render/renderers/webGL/registry/programs/circle";
import { createColorProgram } from "@render/renderers/webGL/registry/programs/color";
import { createSpriteProgram } from "@render/renderers/webGL/registry/programs/sprite";

export const registry = createProgramRegistry({
  color: createColorProgram,
  circle: createCircleProgram,
  sprite: createSpriteProgram,
});

export type WebGLProgramRegistry = typeof registry;