import type { EngineOverlay } from "@engine";

export type DomLoadingOverlayOptions = {
  id: string;
  message: string;
  zIndex: number;
  scope?: "viewport" | "canvas-parent";
};

export function createDomLoadingOverlay(options: DomLoadingOverlayOptions): EngineOverlay {
  const root = document.createElement("div");
  root.id = options.id;
  root.style.position = options.scope === "canvas-parent" ? "absolute" : "fixed";
  root.style.inset = "0";
  root.style.display = "none";
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.background = "rgba(0, 0, 0, 0.72)";
  root.style.color = "white";
  root.style.fontFamily = "sans-serif";
  root.style.zIndex = `${options.zIndex}`;
  root.style.pointerEvents = "none";
  root.textContent = options.message;

  const getContainer = (): HTMLElement => {
    if (options.scope !== "canvas-parent") {
      return document.body;
    }

    const container = document.querySelector("canvas")?.parentElement;
    if (!container) {
      return document.body;
    }

    if (window.getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    return container;
  };

  return {
    begin() {
      if (!root.isConnected) {
        getContainer().append(root);
      }

      root.style.display = "flex";
    },
    end() {
      root.style.display = "none";
    },
    dispose() {
      root.remove();
    },
  };
}
