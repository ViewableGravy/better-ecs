import { EngineUiContext, type EngineUiContextValue } from "../utilities/engine-context";
import { EngineCanvas } from "./engine-canvas";
import { EngineEditorLayout } from "./engine-editor-layout";
import { PreviewMode } from "./previewMode";
import { QuickActions } from "./quickActions";
import styles from "./styles.module.css";
import { WorldsEntitiesPanel } from "./worlds-entities-panel";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type DefaultEngineEditorViewProps = {
  engine: EngineUiContextValue;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const DefaultEngineEditorView: React.FC<DefaultEngineEditorViewProps> = ({ engine }) => {
  return (
    <EngineUiContext value={engine}>
      <PreviewMode>
        <div className={styles.defaultEngineEditorViewRootFill}>
          <EngineEditorLayout.Root>
            <EngineEditorLayout.QuickActions>
              <QuickActions.PreviewModeToggle />
              <QuickActions.ReloadCanvas />
              <QuickActions.ReloadEngine />
            </EngineEditorLayout.QuickActions>

            <PreviewMode.Disabled>
              <EngineEditorLayout.LeftSidebar>
                <EngineEditorLayout.PanelTitle>Worlds / Entities</EngineEditorLayout.PanelTitle>
                <EngineEditorLayout.PanelContent className={styles.worldsEntitiesPanelContent}>
                  <WorldsEntitiesPanel />
                </EngineEditorLayout.PanelContent>
              </EngineEditorLayout.LeftSidebar>
            </PreviewMode.Disabled>

            <EngineEditorLayout.Center>
              <EngineCanvas />
            </EngineEditorLayout.Center>

            <PreviewMode.Disabled>
              <EngineEditorLayout.RightSidebar>
                <EngineEditorLayout.PanelTitle>Components</EngineEditorLayout.PanelTitle>
                <EngineEditorLayout.PanelContent>Right sidebar placeholder</EngineEditorLayout.PanelContent>
              </EngineEditorLayout.RightSidebar>

              <EngineEditorLayout.BottomBar>
                <EngineEditorLayout.PanelTitle>Output / Timeline</EngineEditorLayout.PanelTitle>
                <EngineEditorLayout.PanelContent>Bottom bar placeholder</EngineEditorLayout.PanelContent>
              </EngineEditorLayout.BottomBar>
            </PreviewMode.Disabled>
          </EngineEditorLayout.Root>
        </div>
      </PreviewMode>
    </EngineUiContext>
  );
};
