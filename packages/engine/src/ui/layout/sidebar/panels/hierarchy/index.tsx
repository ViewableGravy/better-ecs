import { TabPanel } from "@headlessui/react";
import { EngineEditorLayout } from "@ui/layout/components/engineEditorLayout";
import styles from "@ui/layout/sidebar/styles.module.css";
import { WorldIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { Dropdown } from "@ui/layout/sidebar/worldViewer/dropdown";
import { WorldEntitiesDropdown } from "@ui/layout/sidebar/worldViewer/entityItemList";
import { WorldEntitiesButton } from "@ui/layout/sidebar/worldViewer/worldButton";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import { useSceneSelector } from "@ui/utilities/hooks/use-scene-selector";

export const HierarchyPanel: React.FC = () => {
  const engine = useInvariantContext(EngineUiContext);
  const activeSceneName = useSceneSelector(engine.scene, (scene) => scene.activeSceneName);
  const activeWorldId = useSceneSelector(engine.scene, (scene) => scene.activeWorldId);
  const worldIds = useSceneSelector(engine.scene, (scene) => {
    const ids: string[] = [];

    for (const [worldId] of scene.context.worldEntries) {
      ids.push(worldId);
    }

    return ids.sort((left, right) => left.localeCompare(right));
  });

  const panelTitle = activeSceneName ? `Scene Hierarchy - ${activeSceneName}` : "Scene Hierarchy";

  return (
    <TabPanel className={styles.tabPanel}>
      <EngineEditorLayout.PanelTitle>{panelTitle}</EngineEditorLayout.PanelTitle>
      <EngineEditorLayout.PanelContent className={styles.hierarchyPanelContent}>
        <ul className={styles.worldsEntitiesPanel}>
          {worldIds.map((worldId) => (
            <WorldIdContext value={worldId} key={worldId}>
              <li className={styles.worldsEntitiesEntityItem}>
                <Dropdown.Manager defaultExpanded={worldId === activeWorldId}>
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
