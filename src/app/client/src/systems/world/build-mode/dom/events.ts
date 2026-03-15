import { type RegisteredSystems } from "@engine";
import { Engine, fromContext, System } from "@engine/context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type Destroy = () => void;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export class BuildModeDomEvents {
  static #instance: BuildModeDomEvents | null = null;

  private readonly canvas: HTMLCanvasElement;
  private readonly data: RegisteredSystems['main:build-mode']["data"];

  private constructor() {
    this.canvas = fromContext(Engine).canvas;
    this.data = fromContext(System("main:build-mode")).data;
  }

  public static create(): Destroy {
    if (BuildModeDomEvents.#instance) {
      console.warn("Build mode DOM events already bound");
      return () => {
        /* noop */
      };
    }

    const instance = new BuildModeDomEvents();
    BuildModeDomEvents.#instance = instance;

    instance.canvas.addEventListener("pointerdown", instance.onPointerDown);
    instance.canvas.addEventListener("contextmenu", instance.onContextMenu);
    window.addEventListener("pointerup", instance.onPointerUp);
    window.addEventListener("pointercancel", instance.onPointerCancel);

    return () => instance.remove();
  }

  private remove(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerCancel);

    if (BuildModeDomEvents.#instance === this) {
      BuildModeDomEvents.#instance = null;
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button === 0) {
      this.data.pendingPlace = true;
      this.data.placePointerActive = true;
    }

    if (event.button === 2) {
      this.data.pendingDelete = true;
      event.preventDefault();
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.button !== 0) {
      return;
    }

    this.data.placePointerActive = false;
  };

  private onPointerCancel = (): void => {
    this.data.placePointerActive = false;
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
