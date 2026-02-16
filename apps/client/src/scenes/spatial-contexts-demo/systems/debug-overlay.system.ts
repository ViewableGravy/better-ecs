import { PlayerComponent } from "@/components/player";
import { Placeable } from "@/scenes/spatial-contexts-demo/build-mode/components";
import { createSystem } from "@repo/engine";
import { Shape, Transform2D } from "@repo/engine/components";
import { useContextManager } from "@repo/spatial-contexts";
import { RenderVisibility } from "../components/render-visibility";

const OVERLAY_ID = "spatial-contexts-overlay";

let overlayClosed = false;
let overlayRefs: OverlayRefs | undefined;

type OverlayKey =
  | "focused"
  | "stack"
  | "visible"
  | "player"
  | "placeables"
  | "outsideAlpha"
  | "roofAlpha"
  | "interiorAlpha";

type OverlayRefs = {
  node: HTMLElement;
  values: Record<OverlayKey, HTMLSpanElement>;
};

const overlayState = {
  focused: "",
  stack: [] as string[],
  visible: [] as string[],
  playerMissing: true,
  playerX: Number.NaN,
  playerY: Number.NaN,
  placeables: "",
  outsideAlpha: Number.NaN,
  roofAlpha: Number.NaN,
  interiorAlpha: Number.NaN,
};

export const DebugOverlaySystem = createSystem("demo:spatial-contexts-debug")({
  system() {
    if (overlayClosed) {
      return;
    }

    const manager = useContextManager();

    const refs = getOrCreateOverlayWindow();
    if (!refs) {
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
    const placeableState = getPlaceableState(manager);

    setTextIfChanged(refs.values.focused, "focused", focused);

    if (hasSequenceChanged(overlayState.stack, stack)) {
      copySequence(overlayState.stack, stack);
      setTextIfChanged(refs.values.stack, "stack", stack.join(" -> "));
    }

    if (hasSequenceChanged(overlayState.visible, visible)) {
      copySequence(overlayState.visible, visible);
      setTextIfChanged(refs.values.visible, "visible", visible.join(" -> "));
    }

    if (player) {
      const playerX = player.curr.pos.x;
      const playerY = player.curr.pos.y;
      if (
        overlayState.playerMissing ||
        playerX !== overlayState.playerX ||
        playerY !== overlayState.playerY
      ) {
        overlayState.playerMissing = false;
        overlayState.playerX = playerX;
        overlayState.playerY = playerY;
        setTextIfChanged(refs.values.player, "player", playerPosition);
      }
    } else if (!overlayState.playerMissing) {
      overlayState.playerMissing = true;
      overlayState.playerX = Number.NaN;
      overlayState.playerY = Number.NaN;
      setTextIfChanged(refs.values.player, "player", "missing");
    }

    if (overlayState.placeables !== placeableState) {
      overlayState.placeables = placeableState;
      setTextIfChanged(refs.values.placeables, "placeables", placeableState);
    }

    if (alphaState.outside !== overlayState.outsideAlpha) {
      overlayState.outsideAlpha = alphaState.outside;
      setTextIfChanged(
        refs.values.outsideAlpha,
        "outsideAlpha",
        alphaState.outside.toFixed(2),
      );
    }

    if (alphaState.roof !== overlayState.roofAlpha) {
      overlayState.roofAlpha = alphaState.roof;
      setTextIfChanged(refs.values.roofAlpha, "roofAlpha", alphaState.roof.toFixed(2));
    }

    if (alphaState.interior !== overlayState.interiorAlpha) {
      overlayState.interiorAlpha = alphaState.interior;
      setTextIfChanged(
        refs.values.interiorAlpha,
        "interiorAlpha",
        alphaState.interior.toFixed(2),
      );
    }
  },
});

function getOrCreateOverlayWindow() {
  if (overlayRefs?.node.isConnected) {
    return overlayRefs;
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
    overlayRefs = undefined;
    node.remove();
  });

  const content = document.createElement("div");
  content.style.margin = "0";
  content.style.padding = "8px 10px";
  content.style.display = "grid";
  content.style.gridTemplateColumns = "auto 1fr";
  content.style.columnGap = "8px";
  content.style.rowGap = "4px";

  const values: Record<OverlayKey, HTMLSpanElement> = {
    focused: createOverlayRow(content, "focused"),
    stack: createOverlayRow(content, "stack"),
    visible: createOverlayRow(content, "visible"),
    player: createOverlayRow(content, "player"),
    placeables: createOverlayRow(content, "placeables"),
    outsideAlpha: createOverlayRow(content, "outsideAlpha"),
    roofAlpha: createOverlayRow(content, "roofAlpha"),
    interiorAlpha: createOverlayRow(content, "interiorAlpha"),
  };

  topBar.append(title, minimizeButton);
  node.append(topBar, content);
  setupDrag(node, topBar);
  document.body.appendChild(node);

  overlayRefs = {
    node,
    values,
  };

  return overlayRefs;
}

function createOverlayRow(container: HTMLElement, label: string): HTMLSpanElement {
  const labelNode = document.createElement("span");
  labelNode.textContent = `${label}:`;
  labelNode.style.opacity = "0.8";

  const valueNode = document.createElement("span");
  valueNode.textContent = "-";
  valueNode.style.wordBreak = "break-word";

  container.append(labelNode, valueNode);

  return valueNode;
}

function setTextIfChanged(node: HTMLSpanElement, key: OverlayKey, value: string) {
  if (key === "focused" && overlayState.focused === value) {
    return;
  }

  if (key === "focused") {
    overlayState.focused = value;
  }

  if (node.textContent === value) {
    return;
  }

  node.textContent = value;
}

function hasSequenceChanged(previous: string[], current: readonly string[]) {
  if (previous.length !== current.length) {
    return true;
  }

  for (let i = 0; i < current.length; i += 1) {
    if (previous[i] !== current[i]) {
      return true;
    }
  }

  return false;
}

function copySequence(target: string[], source: readonly string[]) {
  target.length = source.length;
  for (let i = 0; i < source.length; i += 1) {
    target[i] = source[i];
  }
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

function getPlaceableState(manager: ReturnType<typeof useContextManager>): string {
  const parts: string[] = [];

  for (const { id } of manager.listDefinitions()) {
    const world = manager.getWorld(id);
    if (!world) {
      continue;
    }

    parts.push(`${id}:${world.query(Placeable).length}`);
  }

  return parts.join(" | ");
}
