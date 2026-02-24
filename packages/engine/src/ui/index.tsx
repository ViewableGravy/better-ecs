import { createRoot } from "react-dom/client";
import { DefaultEngineEditorView } from "@ui/layout";
import { attachCanvas, type AttachCanvasOptions, type AttachedCanvas } from "@ui/utilities/attach-canvas";
import { type EngineUiContextValue } from "@ui/utilities/engine-context";

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

export { DefaultEngineEditorView } from "@ui/layout";
export { EngineCanvas } from "@ui/layout/canvas";
export { EngineEditorLayout } from "@ui/layout/components/engineEditorLayout";
export { PreviewMode } from "@ui/components/previewMode";
export { QuickActions } from "@ui/layout/quick-actions";
export { attachCanvas } from "@ui/utilities/attach-canvas";
export type { AttachCanvasOptions, AttachedCanvas } from "@ui/utilities/attach-canvas";
export { EngineUiContext } from "@ui/utilities/engine-context";
export type { EngineUiContextValue } from "@ui/utilities/engine-context";


