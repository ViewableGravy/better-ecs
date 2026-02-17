import { createRoot } from "react-dom/client";
import { DefaultEngineEditorView } from "./components/default-engine-editor-view";
import { attachCanvas, type AttachCanvasOptions, type AttachedCanvas } from "./utilities/attach-canvas";
import { type EngineUiContextValue } from "./utilities/engine-context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type MountEngineEditorUiOptions = {
  rootElement: HTMLElement;
  engine: EngineUiContextValue;
};

export type MountedEngineEditorUi = {
  unmount: () => void;
};

export function mountEngineEditorUi({ rootElement, engine }: MountEngineEditorUiOptions): MountedEngineEditorUi {
  const reactRoot = createRoot(rootElement);
  reactRoot.render(<DefaultEngineEditorView engine={engine} />);

  return {
    unmount: () => {
      reactRoot.unmount();
    }
  };
}

export function mountEngineCanvasOnly(rootElement: HTMLElement, options?: AttachCanvasOptions): AttachedCanvas {
  return attachCanvas(rootElement, options);
}

export { EngineCanvas } from "./components/engine-canvas";
export { EngineEditorLayout } from "./components/engine-editor-layout";
export { PreviewMode } from "./components/previewMode";
export { QuickActions } from "./components/quickActions";
export { attachCanvas } from "./utilities/attach-canvas";
export type { AttachCanvasOptions, AttachedCanvas } from "./utilities/attach-canvas";
export { EngineUiContext } from "./utilities/engine-context";
export type { EngineUiContextValue } from "./utilities/engine-context";


