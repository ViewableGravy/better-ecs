import { CSSProperties } from "react";
import { createRoot } from "react-dom/client";

import { EngineCanvas } from "./components/engine-canvas";
import { EngineEditorLayout } from "./components/engine-editor-layout";
import { attachCanvas, type AttachCanvasOptions, type AttachedCanvas } from "./utilities/attach-canvas";
import { EngineUiContext, type EngineUiContextValue } from "./utilities/engine-context";

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

const ROOT_FILL_STYLE: CSSProperties = {
  width: "100%",
  height: "100%"
};

type DefaultEngineEditorViewProps = {
  engine: EngineUiContextValue;
};

type DefaultEngineEditorViewComponent = React.FC<DefaultEngineEditorViewProps>;

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

const DefaultEngineEditorView: DefaultEngineEditorViewComponent = ({ engine }) => {
  return (
    <EngineUiContext value={engine}>
      <div style={ROOT_FILL_STYLE}>
        <EngineEditorLayout.Root>
          <EngineEditorLayout.LeftSidebar>
            <EngineEditorLayout.PanelTitle>Worlds / Entities</EngineEditorLayout.PanelTitle>
            <EngineEditorLayout.PanelContent>Left sidebar placeholder</EngineEditorLayout.PanelContent>
          </EngineEditorLayout.LeftSidebar>

          <EngineEditorLayout.Center>
            <EngineCanvas />
          </EngineEditorLayout.Center>

          <EngineEditorLayout.RightSidebar>
            <EngineEditorLayout.PanelTitle>Components</EngineEditorLayout.PanelTitle>
            <EngineEditorLayout.PanelContent>Right sidebar placeholder</EngineEditorLayout.PanelContent>
          </EngineEditorLayout.RightSidebar>

          <EngineEditorLayout.BottomBar>
            <EngineEditorLayout.PanelTitle>Output / Timeline</EngineEditorLayout.PanelTitle>
            <EngineEditorLayout.PanelContent>Bottom bar placeholder</EngineEditorLayout.PanelContent>
          </EngineEditorLayout.BottomBar>
        </EngineEditorLayout.Root>
      </div>
    </EngineUiContext>
  );
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
export { attachCanvas } from "./utilities/attach-canvas";
export type { AttachCanvasOptions, AttachedCanvas } from "./utilities/attach-canvas";
export { EngineUiContext } from "./utilities/engine-context";
export type { EngineUiContextValue } from "./utilities/engine-context";
export { useInvariantContext } from "./utilities/hooks/use-invariant-context";

