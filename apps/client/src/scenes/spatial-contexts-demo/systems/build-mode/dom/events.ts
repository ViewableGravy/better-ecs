import { invariantReturn } from "@/utilities/invariantReturn";
import { useEngine, useSystem, type RegisteredSystems } from "@repo/engine";

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
    this.canvas = invariantReturn(useEngine().canvas);
    this.data = useSystem("main:build-mode").data;
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

    return () => instance.remove();
  }

  private remove(): void {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);

    if (BuildModeDomEvents.#instance === this) {
      BuildModeDomEvents.#instance = null;
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button === 0) {
      this.data.pendingPlace = true;
    }

    if (event.button === 2) {
      this.data.pendingDelete = true;
      event.preventDefault();
    }
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
