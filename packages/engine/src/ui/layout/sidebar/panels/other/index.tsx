import { TabPanel } from "@headlessui/react";
import { EngineEditorLayout } from "../../../components/engineEditorLayout";
import styles from "../../styles.module.css";

export const OtherPanel: React.FC = () => {
  return (
    <TabPanel className={styles.tabPanel}>
      <EngineEditorLayout.PanelTitle>Components</EngineEditorLayout.PanelTitle>
      <EngineEditorLayout.PanelContent>Components placeholder</EngineEditorLayout.PanelContent>
    </TabPanel>
  );
};
