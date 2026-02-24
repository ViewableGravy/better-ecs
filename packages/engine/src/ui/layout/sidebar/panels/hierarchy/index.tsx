import { TabPanel } from "@headlessui/react";
import { EngineEditorLayout } from "../../../components/engineEditorLayout";
import { EngineUiContext } from "../../../utilities/engine-context";
import { useIntervalState } from "../../../utilities/hooks/use-interval-state";
import { useInvariantContext } from "../../../utilities/hooks/use-invariant-context";
import styles from "../../styles.module.css";
import { WorldIdContext } from "../../worldViewer/context";
import { Dropdown } from "../../worldViewer/dropdown";
import { WorldEntitiesDropdown } from "../../worldViewer/entityItemList";
import { WorldEntitiesButton } from "../../worldViewer/worldButton";

export const HierarchyPanel: React.FC = () => {
  const engine = useInvariantContext(EngineUiContext);

  const worldIds = useIntervalState(250, () => {
    const ids: string[] = [];

    for (const [worldId] of engine.scene.context.worldEntries) {
      ids.push(worldId);
    }

    return ids.sort((left, right) => left.localeCompare(right));
  });

  return (
    <TabPanel className={styles.tabPanel}>
      <EngineEditorLayout.PanelTitle>Worlds / Entities</EngineEditorLayout.PanelTitle>
      <EngineEditorLayout.PanelContent className={styles.hierarchyPanelContent}>
        <ul className={styles.worldsEntitiesPanel}>
          {worldIds.map((worldId) => (
            <WorldIdContext value={worldId} key={worldId}>
              <li className={styles.worldsEntitiesEntityItem}>
                <Dropdown.Manager defaultExpanded={worldId === engine.scene.activeWorldId}>
                  <WorldEntitiesButton />
                  <Dropdown.Content>
                    <WorldEntitiesDropdown />
                  </Dropdown.Content>
                </Dropdown.Manager>
              </li>
            </WorldIdContext>
          ))}
        </ul>
      </EngineEditorLayout.PanelContent>
    </TabPanel>
  );
};
