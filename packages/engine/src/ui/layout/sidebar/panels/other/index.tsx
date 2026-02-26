import { TabPanel } from "@headlessui/react";
import { EngineEditorLayout } from "@ui/layout/components/engineEditorLayout/index";
import styles from "@ui/layout/sidebar/styles.module.css";

export const OtherPanel: React.FC = () => {
  return (
    <TabPanel className={styles.tabPanel}>
      <EngineEditorLayout.PanelTitle>Components</EngineEditorLayout.PanelTitle>
      <EngineEditorLayout.PanelContent>Components placeholder</EngineEditorLayout.PanelContent>
    </TabPanel>
  );
};
