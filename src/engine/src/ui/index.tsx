import { DefaultEngineEditorView } from "@engine/ui/layout";
import { attachCanvas, type AttachCanvasOptions, type AttachedCanvas } from "@engine/ui/utilities/attach-canvas";
import { type EngineUiContextValue } from "@ui/utilities/engine-context";
import { createRoot } from "react-dom/client";

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

export { PreviewMode } from "@engine/ui/components/previewMode";
export { DefaultEngineEditorView } from "@engine/ui/layout";
export { EngineCanvas } from "@engine/ui/layout/canvas";
export { EngineEditorLayout } from "@engine/ui/layout/components/engineEditorLayout/index";
export { QuickActions } from "@engine/ui/layout/quick-actions";
export { attachCanvas } from "@engine/ui/utilities/attach-canvas";
export type { AttachCanvasOptions, AttachedCanvas } from "@engine/ui/utilities/attach-canvas";
export { EngineUiContext } from "@engine/ui/utilities/engine-context";
export type { EngineUiContextValue } from "@engine/ui/utilities/engine-context";


