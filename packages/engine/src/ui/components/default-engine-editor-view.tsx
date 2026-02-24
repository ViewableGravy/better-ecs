import { Cube, TreeStructure } from "@phosphor-icons/react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
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
  const inactiveIconColor = "#8c95aa";
  const activeIconColor = "#7387ff";

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
                <TabGroup className={styles.leftSidebarTabsRoot}>
                  <TabPanels className={styles.leftSidebarTabPanels}>
                    <TabPanel className={styles.leftSidebarTabPanel}>
                      <EngineEditorLayout.PanelTitle>Worlds / Entities</EngineEditorLayout.PanelTitle>
                      <EngineEditorLayout.PanelContent className={styles.worldsEntitiesPanelContent}>
                        <WorldsEntitiesPanel />
                      </EngineEditorLayout.PanelContent>
                    </TabPanel>

                    <TabPanel className={styles.leftSidebarTabPanel}>
                      <EngineEditorLayout.PanelTitle>Components</EngineEditorLayout.PanelTitle>
                      <EngineEditorLayout.PanelContent>Components placeholder</EngineEditorLayout.PanelContent>
                    </TabPanel>
                  </TabPanels>

                  <TabList className={styles.leftSidebarTabList}>
                    <Tab className={styles.leftSidebarTabButton}>
                      {({ selected }) => (
                        <div className={styles.leftSidebarTabIconSlot}>
                          <div
                            className={styles.leftSidebarTabIconLayer}
                            style={{
                              transform: selected ? "translate(-50%, -50%) scale(1.12)" : "translate(-50%, -50%) scale(1)",
                            }}
                          >
                            <TreeStructure size={18} color={selected ? activeIconColor : inactiveIconColor} weight="regular" />
                          </div>
                        </div>
                      )}
                    </Tab>

                    <Tab className={styles.leftSidebarTabButton}>
                      {({ selected }) => (
                        <div className={styles.leftSidebarTabIconSlot}>
                          <div
                            className={styles.leftSidebarTabIconLayer}
                            style={{
                              transform: selected ? "translate(-50%, -50%) scale(1.12)" : "translate(-50%, -50%) scale(1)",
                            }}
                          >
                            <Cube size={18} color={selected ? activeIconColor : inactiveIconColor} weight="regular" />
                          </div>
                        </div>
                      )}
                    </Tab>
                  </TabList>
                </TabGroup>
              </EngineEditorLayout.LeftSidebar>
            </PreviewMode.Disabled>

            <EngineEditorLayout.Center>
              <EngineCanvas />
            </EngineEditorLayout.Center>

            <PreviewMode.Disabled>
              {/* <EngineEditorLayout.RightSidebar>
                <EngineEditorLayout.PanelTitle>Components</EngineEditorLayout.PanelTitle>
                <EngineEditorLayout.PanelContent>Right sidebar placeholder</EngineEditorLayout.PanelContent>
              </EngineEditorLayout.RightSidebar> */}

              {/* <EngineEditorLayout.BottomBar>
                <EngineEditorLayout.PanelTitle>Output / Timeline</EngineEditorLayout.PanelTitle>
                <EngineEditorLayout.PanelContent>Bottom bar placeholder</EngineEditorLayout.PanelContent>
              </EngineEditorLayout.BottomBar> */}
            </PreviewMode.Disabled>
          </EngineEditorLayout.Root>
        </div>
      </PreviewMode>
    </EngineUiContext>
  );
};
