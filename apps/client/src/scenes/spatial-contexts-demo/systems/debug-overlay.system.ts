import { PlayerComponent } from "@/components/player";
import { createSystem } from "@repo/engine";
import { Shape, Transform2D } from "@repo/engine/components";
import { useContextManager } from "@repo/spatial-contexts";
import { RenderVisibility } from "../components/render-visibility";

const OVERLAY_ID = "spatial-contexts-overlay";
const OVERLAY_CONTENT_ID = "spatial-contexts-overlay-content";

let overlayClosed = false;

export const DebugOverlaySystem = createSystem("demo:spatial-contexts-debug")({
  system() {
    if (overlayClosed) {
      return;
    }

    const manager = useContextManager();

    const node = getOrCreateOverlayWindow();
    if (!node) {
      return;
    }

    const content = document.getElementById(OVERLAY_CONTENT_ID);
    if (!content) {
      return;
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

    content.textContent = [
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

function getOrCreateOverlayWindow() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    return existing;
  }

  const node = document.createElement("div");
  node.id = OVERLAY_ID;
  node.style.position = "fixed";
  node.style.right = "10px";
  node.style.top = "220px";
  node.style.zIndex = "1001";
  node.style.width = "320px";
  node.style.background = "rgba(0,0,0,0.8)";
  node.style.border = "1px solid rgba(255,255,255,0.12)";
  node.style.borderRadius = "8px";
  node.style.color = "#fff";
  node.style.fontFamily = "monospace";
  node.style.fontSize = "12px";
  node.style.boxSizing = "border-box";

  const topBar = document.createElement("div");
  topBar.style.display = "flex";
  topBar.style.alignItems = "center";
  topBar.style.justifyContent = "space-between";
  topBar.style.padding = "8px 10px";
  topBar.style.cursor = "grab";
  topBar.style.userSelect = "none";
  topBar.style.borderBottom = "1px solid rgba(255,255,255,0.12)";

  const title = document.createElement("span");
  title.textContent = "Spatial Contexts Debug";
  title.style.fontWeight = "700";

  const minimizeButton = document.createElement("button");
  minimizeButton.type = "button";
  minimizeButton.textContent = "×";
  minimizeButton.style.background = "transparent";
  minimizeButton.style.border = "none";
  minimizeButton.style.color = "#fff";
  minimizeButton.style.cursor = "pointer";
  minimizeButton.style.fontSize = "16px";
  minimizeButton.style.lineHeight = "1";
  minimizeButton.style.padding = "0";
  minimizeButton.style.width = "20px";
  minimizeButton.style.height = "20px";
  minimizeButton.title = "Minimize";
  minimizeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    overlayClosed = true;
    node.remove();
  });

  const content = document.createElement("pre");
  content.id = OVERLAY_CONTENT_ID;
  content.style.margin = "0";
  content.style.padding = "8px 10px";
  content.style.whiteSpace = "pre-wrap";
  content.style.wordBreak = "break-word";

  topBar.append(title, minimizeButton);
  node.append(topBar, content);
  setupDrag(node, topBar);
  document.body.appendChild(node);

  return node;
}

function setupDrag(windowNode: HTMLElement, topBarNode: HTMLElement) {
  let dragging = false;
  let activePointerId = -1;
  let startClientX = 0;
  let startClientY = 0;
  let startLeft = 0;
  let startTop = 0;

  topBarNode.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (target instanceof HTMLButtonElement) {
      return;
    }

    const rect = windowNode.getBoundingClientRect();
    windowNode.style.left = `${rect.left}px`;
    windowNode.style.top = `${rect.top}px`;
    windowNode.style.right = "auto";

    dragging = true;
    activePointerId = event.pointerId;
    startClientX = event.clientX;
    startClientY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;

    topBarNode.style.cursor = "grabbing";
    topBarNode.setPointerCapture(activePointerId);
  });

  topBarNode.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== activePointerId) {
      return;
    }

    const deltaX = event.clientX - startClientX;
    const deltaY = event.clientY - startClientY;

    windowNode.style.left = `${startLeft + deltaX}px`;
    windowNode.style.top = `${startTop + deltaY}px`;
  });

  const endDrag = (pointerId: number) => {
    if (!dragging || pointerId !== activePointerId) {
      return;
    }

    dragging = false;
    activePointerId = -1;
    topBarNode.style.cursor = "grab";
    if (topBarNode.hasPointerCapture(pointerId)) {
      topBarNode.releasePointerCapture(pointerId);
    }
  };

  topBarNode.addEventListener("pointerup", (event) => {
    endDrag(event.pointerId);
  });

  topBarNode.addEventListener("pointercancel", (event) => {
    endDrag(event.pointerId);
  });
}

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
