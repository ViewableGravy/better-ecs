import React from "react";
import { Cube, TreeStructure } from "@phosphor-icons/react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import classNames from "classnames";
import { EngineUiContext, type EngineUiContextValue } from "../utilities/engine-context";
import { EngineCanvas } from "./engine-canvas";
import { EngineEditorLayout } from "./engine-editor-layout";
import { PreviewMode } from "./previewMode";
import { QuickActions } from "./quickActions";
import styles from "./DefaultEngineEditorView.module.scss";
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
        <div className={styles.defaultEngineEditorView}>
          <EngineEditorLayout.Root>
            <EngineEditorLayout.QuickActions>
              <QuickActions.PreviewModeToggle />
              <QuickActions.ReloadCanvas />
              <QuickActions.ReloadEngine />
            </EngineEditorLayout.QuickActions>

            <PreviewMode.Disabled>
              <EngineEditorLayout.LeftSidebar>
                <TabGroup className={styles.tabsRoot}>
                  <TabPanels className={styles.tabPanels}>
                    <TabPanel className={styles.tabPanel}>
                      <EngineEditorLayout.PanelTitle>Worlds / Entities</EngineEditorLayout.PanelTitle>
                      <EngineEditorLayout.PanelContent className={styles.worldsEntitiesPanelContent}>
                        <WorldsEntitiesPanel />
                      </EngineEditorLayout.PanelContent>
                    </TabPanel>

                    <TabPanel className={styles.tabPanel}>
                      <EngineEditorLayout.PanelTitle>Components</EngineEditorLayout.PanelTitle>
                      <EngineEditorLayout.PanelContent>Components placeholder</EngineEditorLayout.PanelContent>
                    </TabPanel>
                  </TabPanels>

                  <TabList className={styles.tabList}>
                    <Tab as={React.Fragment}>
                      {({ selected }) => {
                        const tabButtonClassName = classNames(styles.tabButton, {
                          [styles.tabButtonSelected]: selected,
                        });

                        return (
                          <button className={tabButtonClassName}>
                            <div className={styles.tabIconSlot}>
                              <div className={styles.tabIconLayer}>
                                <TreeStructure size={18} color="currentColor" weight="regular" />
                              </div>
                            </div>
                          </button>
                        );
                      }}
                    </Tab>

                    <Tab as={React.Fragment}>
                      {({ selected }) => {
                        const tabButtonClassName = classNames(styles.tabButton, {
                          [styles.tabButtonSelected]: selected,
                        });

                        return (
                          <button className={tabButtonClassName}>
                            <div className={styles.tabIconSlot}>
                              <div className={styles.tabIconLayer}>
                                <Cube size={18} color="currentColor" weight="regular" />
                              </div>
                            </div>
                          </button>
                        );
                      }}
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
