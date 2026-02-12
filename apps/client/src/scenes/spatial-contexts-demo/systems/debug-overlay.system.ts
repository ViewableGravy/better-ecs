import { PlayerComponent } from "@/components/player";
import { createSystem } from "@repo/engine";
import { Shape, Transform2D } from "@repo/engine/components";
import { useContextManager } from "@repo/plugins";
import { RenderVisibility } from "../components/render-visibility";

export const DebugOverlaySystem = createSystem("demo:spatial-contexts-debug")({
  phase: "all",
  system() {
    const manager = useContextManager();

    let node = document.getElementById("spatial-contexts-overlay");
    if (!node) {
      node = document.createElement("div");
      node.id = "spatial-contexts-overlay";
      node.style.position = "fixed";
      node.style.right = "10px";
      node.style.top = "10px";
      node.style.zIndex = "1001";
      node.style.background = "rgba(0,0,0,0.65)";
      node.style.color = "#fff";
      node.style.padding = "8px 10px";
      node.style.borderRadius = "6px";
      node.style.fontFamily = "monospace";
      node.style.fontSize = "12px";
      document.body.appendChild(node);
    }

    const focused = manager.getFocusedContextId();
    const stack = manager.getContextStack();
    const visible = manager.getVisibleContextIds();
    const world = manager.getWorldOrThrow(focused);
    const [playerId] = world.query(PlayerComponent);
    const player = playerId ? world.get(playerId, Transform2D) : undefined;
    const playerPosition = player
      ? `${player.curr.pos.x.toFixed(1)}, ${player.curr.pos.y.toFixed(1)}`
      : "missing";

    const alphaState = getAlphaState(manager);

    node.innerText = [
      `focused: ${focused}`,
      `stack: ${stack.join(" -> ")}`,
      `visible: ${visible.join(" -> ")}`,
      `player: ${playerPosition}`,
      `outsideAlpha: ${alphaState.outside.toFixed(2)}`,
      `roofAlpha: ${alphaState.roof.toFixed(2)}`,
      `interiorAlpha: ${alphaState.interior.toFixed(2)}`,
    ].join("\n");
  },
});

function getAlphaState(manager: ReturnType<typeof useContextManager>) {
  const sample = {
    outside: 1,
    roof: 1,
    interior: 1,
  };

  for (const { id: contextId } of manager.listDefinitions()) {
    const world = manager.getWorld(contextId);
    if (!world) continue;

    for (const entityId of world.query(Shape, RenderVisibility)) {
      const shape = world.get(entityId, Shape);
      const visibility = world.get(entityId, RenderVisibility);
      if (!shape || !visibility) continue;

      if (visibility.role === "outside") {
        sample.outside = shape.fill.a;
      }

      if (visibility.role === "house-roof") {
        sample.roof = shape.fill.a;
      }

      if (visibility.role === "house-interior") {
        sample.interior = shape.fill.a;
      }
    }
  }

  return sample;
}
