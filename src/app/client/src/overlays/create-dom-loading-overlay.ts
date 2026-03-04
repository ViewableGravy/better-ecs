import type { EngineOverlay } from "@engine";

export type DomLoadingOverlayOptions = {
  id: string;
  message: string;
  zIndex: number;
};

type OverlayElements = {
  root: HTMLDivElement;
  label: HTMLDivElement;
};

function createOverlayElements(options: DomLoadingOverlayOptions): OverlayElements {
  const root = document.createElement("div");
  root.id = options.id;
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.display = "none";
  root.style.alignItems = "center";
  root.style.justifyContent = "center";
  root.style.background = "rgba(0, 0, 0, 0.72)";
  root.style.color = "white";
  root.style.fontFamily = "sans-serif";
  root.style.fontSize = "16px";
  root.style.letterSpacing = "0.02em";
  root.style.zIndex = `${options.zIndex}`;
  root.style.pointerEvents = "none";

  const label = document.createElement("div");
  label.textContent = options.message;
  root.append(label);

  return { root, label };
}

export function createDomLoadingOverlay(options: DomLoadingOverlayOptions): EngineOverlay {
  const elements = createOverlayElements(options);

  const attachIfNeeded = () => {
    if (!elements.root.isConnected) {
      document.body.append(elements.root);
    }
  };

  return {
    begin(): void {
      attachIfNeeded();
      elements.label.textContent = options.message;
      elements.root.style.display = "flex";
    },
    end(): void {
      elements.root.style.display = "none";
    },
    dispose(): void {
      elements.root.remove();
    },
  };
}
