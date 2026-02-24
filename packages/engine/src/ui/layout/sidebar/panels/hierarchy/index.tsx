import { TabPanel } from "@headlessui/react";
import { EngineEditorLayout } from "@ui/layout/components/engineEditorLayout";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useIntervalState } from "@ui/utilities/hooks/use-interval-state";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import styles from "@ui/layout/sidebar/styles.module.css";
import { WorldIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { Dropdown } from "@ui/layout/sidebar/worldViewer/dropdown";
import { WorldEntitiesDropdown } from "@ui/layout/sidebar/worldViewer/entityItemList";
import { WorldEntitiesButton } from "@ui/layout/sidebar/worldViewer/worldButton";

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
