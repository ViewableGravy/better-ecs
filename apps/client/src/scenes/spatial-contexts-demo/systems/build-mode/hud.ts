import { invariantReturn } from "@/utilities/invariantReturn";
import { useSystem } from "@repo/engine";
import { HOTBAR_INDICATOR_ID } from "./const";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type Destroy = () => void;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class HUD {
  static #destroyHotbarIndicator: Destroy | null = null;
  static #node: HTMLDivElement | null = null;

  public static create() {
    if (document.getElementById(HOTBAR_INDICATOR_ID)) {
      console.warn("Hotbar indicator already exists");
      return;
    }

    HUD.node = document.createElement("div");
    HUD.node.id = HOTBAR_INDICATOR_ID;
    HUD.node.style.position = "fixed";
    HUD.node.style.right = "12px";
    HUD.node.style.top = "12px";
    HUD.node.style.zIndex = "1200";
    HUD.node.style.padding = "6px 10px";
    HUD.node.style.borderRadius = "6px";
    HUD.node.style.border = "1px solid #ffffff66";
    HUD.node.style.fontFamily = "monospace";
    HUD.node.style.fontSize = "12px";
    HUD.node.style.color = "#fff";
    HUD.node.style.background = "#00000066";
    HUD.node.style.userSelect = "none";
    HUD.node.style.pointerEvents = "none";
    HUD.node.style.display = "none";
    HUD.node.innerText = "Selected: none";
    document.body.appendChild(HUD.node);
  }

  public static remove() {
    if (HUD.#destroyHotbarIndicator) {
      HUD.#destroyHotbarIndicator();
      HUD.#destroyHotbarIndicator = null;
    }
  }

  public static update() {
    const { data } = useSystem("main:build-mode");

    this.node.style.display = "block";
    this.node.style.background = data.selectedItem ? "#5a125699" : "#00000066";
    
    this.node.innerText = `Selected: ${data.selectedItem ?? "none"}`;
  }

  private static get node(): HTMLDivElement {
    return invariantReturn(HUD.#node, "HUD node does not exist");
  }

  private static set node(value: HTMLDivElement | null) {
    HUD.#node = value;
  }
}
