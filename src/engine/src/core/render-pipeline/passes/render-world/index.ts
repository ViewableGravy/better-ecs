import {
  FromRender,
  fromContext
} from "@engine/context";
import { createRenderPass } from "@engine/core/render-pipeline/pass";
import { queueGizmos } from "@engine/core/render-pipeline/passes/render-world/queue/queue-gizmos";
import { queueShaderQuads } from "@engine/core/render-pipeline/passes/render-world/queue/queue-shader-quads";
import { queueShapes } from "@engine/core/render-pipeline/passes/render-world/queue/queue-shapes";
import { queueSprites } from "@engine/core/render-pipeline/passes/render-world/queue/queue-sprites";
import { renderCommands } from "@engine/core/render-pipeline/passes/render-world/render/render-commands";

export const RenderWorldPass = createRenderPass("world-render")({
  scope: "world",
  execute() {
    queueSprites();
    queueShaderQuads();
    queueShapes();
    queueGizmos();

    renderCommands();
    
    fromContext(FromRender.Queue).clear();
  },
});
