import {
  FromRender,
  fromContext
} from "@context";
import { createRenderPass } from "@core/render-pipeline/pass";
import { queueGizmos } from "@core/render-pipeline/passes/render-world/queue/queue-gizmos";
import { queueShaderQuads } from "@core/render-pipeline/passes/render-world/queue/queue-shader-quads";
import { queueShapes } from "@core/render-pipeline/passes/render-world/queue/queue-shapes";
import { queueSprites } from "@core/render-pipeline/passes/render-world/queue/queue-sprites";
import { updateAnimatedSprites } from "@core/render-pipeline/passes/render-world/queue/update-animated-sprites";
import { renderCommands } from "@core/render-pipeline/passes/render-world/render/render-commands";
import { sortCommands } from "@core/render-pipeline/passes/render-world/sort/sort-commands";

export const RenderWorldPass = createRenderPass("world-render")({
  scope: "world",
  execute() {
    updateAnimatedSprites();
    queueSprites();
    queueShaderQuads();
    queueShapes();
    queueGizmos();

    sortCommands();
    renderCommands();
    
    fromContext(FromRender.Queue).clear();
  },
});
