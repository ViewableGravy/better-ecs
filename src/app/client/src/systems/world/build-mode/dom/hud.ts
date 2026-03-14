import { HOTBAR_INDICATOR_ID } from "@client/systems/world/build-mode/const";
import { invariantReturn } from "@client/utilities/invariantReturn";
import { fromContext, System } from "@engine/context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type Destroy = () => void;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class HUDManager {
  static #previouslySelectedItem: string | null = null;
  static #node: HTMLDivElement | null = null;

  public static create(): Destroy {
    if (document.getElementById(HOTBAR_INDICATOR_ID)) {
      console.warn("Hotbar indicator already exists");
      return () => {
        /* noop */
      };
    }

    HUDManager.node = document.createElement("div");
    HUDManager.node.id = HOTBAR_INDICATOR_ID;
    HUDManager.node.style.position = "fixed";
    HUDManager.node.style.right = "12px";
    HUDManager.node.style.top = "140px";
    HUDManager.node.style.zIndex = "1200";
    HUDManager.node.style.padding = "6px 10px";
    HUDManager.node.style.borderRadius = "6px";
    HUDManager.node.style.border = "1px solid #ffffff66";
    HUDManager.node.style.fontFamily = "monospace";
    HUDManager.node.style.fontSize = "12px";
    HUDManager.node.style.color = "#fff";
    HUDManager.node.style.background = "#00000066";
    HUDManager.node.style.userSelect = "none";
    HUDManager.node.style.pointerEvents = "none";
    HUDManager.node.style.display = "block";
    HUDManager.node.innerText = "Selected: none";
    document.body.appendChild(HUDManager.node);

    return () => HUDManager.remove();
  }

  private static remove() {
    if (HUDManager.#node) {
      HUDManager.#node.remove();
      HUDManager.#node = null;
    }
  }

  public static update() {
    const { data } = fromContext(System("main:build-mode"));

    if (data.selectedItem !== HUDManager.#previouslySelectedItem) {
      this.node.style.background = data.selectedItem ? "#5a125699" : "#00000066";
      this.node.innerText = `Selected: ${data.selectedItem ?? "none"}`;
    }

    this.#previouslySelectedItem = data.selectedItem;
  }

  private static get node(): HTMLDivElement {
    return invariantReturn(HUDManager.#node, "HUD node does not exist");
  }

  private static set node(value: HTMLDivElement | null) {
    HUDManager.#node = value;
  }
}
