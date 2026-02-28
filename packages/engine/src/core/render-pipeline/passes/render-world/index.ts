import {
  FromRender,
  fromContext
} from "../../../../context";
import { createRenderPass } from "../../pass";
import { queueGizmos } from "./queue/queue-gizmos";
import { queueShaderQuads } from "./queue/queue-shader-quads";
import { queueShapes } from "./queue/queue-shapes";
import { queueSprites } from "./queue/queue-sprites";
import { renderCommands } from "./render/render-commands";
import { sortCommands } from "./sort/sort-commands";

export const RenderWorldPass = createRenderPass("world-render")({
  scope: "world",
  execute() {
    queueSprites();
    queueShaderQuads();
    queueShapes();
    queueGizmos();

    sortCommands();
    renderCommands();
    
    fromContext(FromRender.Queue).clear();
  },
});
