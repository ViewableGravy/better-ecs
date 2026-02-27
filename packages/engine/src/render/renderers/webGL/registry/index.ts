import { createProgramRegistry } from "./create";
import { createCircleProgram } from "./programs/circle";
import { createColorProgram } from "./programs/color";
import { createSpriteProgram } from "./programs/sprite";

export const registry = createProgramRegistry({
  color: createColorProgram,
  circle: createCircleProgram,
  sprite: createSpriteProgram,
});