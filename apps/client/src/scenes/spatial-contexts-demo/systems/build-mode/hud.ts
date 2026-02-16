import { useSystem } from "@repo/engine";
import { HOTBAR_INDICATOR_ID } from "./const";

export function ensureHotbarIndicator(): void {
  const existing = document.getElementById(HOTBAR_INDICATOR_ID);
  if (existing) {
    return;
  }

  const indicatorNode = document.createElement("div");
  indicatorNode.id = HOTBAR_INDICATOR_ID;
  indicatorNode.style.position = "fixed";
  indicatorNode.style.right = "12px";
  indicatorNode.style.top = "12px";
  indicatorNode.style.zIndex = "1200";
  indicatorNode.style.padding = "6px 10px";
  indicatorNode.style.borderRadius = "6px";
  indicatorNode.style.border = "1px solid #ffffff66";
  indicatorNode.style.fontFamily = "monospace";
  indicatorNode.style.fontSize = "12px";
  indicatorNode.style.color = "#fff";
  indicatorNode.style.background = "#00000066";
  indicatorNode.style.userSelect = "none";
  indicatorNode.style.pointerEvents = "none";
  indicatorNode.style.display = "none";
  indicatorNode.innerText = "Selected: none";
  document.body.appendChild(indicatorNode);
}

export function removeHotbarIndicator(): void {
  const node = document.getElementById(HOTBAR_INDICATOR_ID);
  node?.remove();
}

export function updateHotbarIndicator(): void {
  const { data } = useSystem("demo:build-mode");

  const node = document.getElementById(HOTBAR_INDICATOR_ID);
  if (!(node instanceof HTMLDivElement)) {
    return;
  }

  node.style.display = "block";
  const selectedText = data.selectedItem ?? "none";
  node.innerText = `Selected: ${selectedText}`;
  node.style.background = data.selectedItem ? "#5a125699" : "#00000066";
}
