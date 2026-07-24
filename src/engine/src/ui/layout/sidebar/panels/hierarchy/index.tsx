import { TabPanel } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import { EngineEditorLayout } from "@engine/ui/layout/components/engineEditorLayout/index";
import { WorldEntitiesDropdown } from "@engine/ui/layout/sidebar/panels/hierarchy/components/worldEntitiesDropdown";
import {
	createHierarchyTreeQueryOptions,
	type HierarchyTreeSnapshot,
} from "@engine/ui/layout/sidebar/panels/hierarchy/queries/hierarchyTreeQuery";
import styles from "@engine/ui/layout/sidebar/styles.module.css";
import { EngineUiContext } from "@engine/ui/utilities/engine-context";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import { useCallback } from "react";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const HierarchyPanel: React.FC = () => {
	/***** HOOKS *****/
	const engine = useInvariantContext(EngineUiContext);

	/***** QUERIES *****/
	const { data, isSuccess } = useQuery({
		...createHierarchyTreeQueryOptions(engine),
		select: useCallback((tree: HierarchyTreeSnapshot) => {
			return {
				activeSceneName: tree.activeSceneName,
			};
		}, []),
	});

	/***** RENDER HELPERS *****/
	const panelTitle = data?.activeSceneName
		? `Scene Hierarchy - ${data.activeSceneName}`
		: "Scene Hierarchy";

	/***** RENDER *****/
	return (
		<TabPanel className={styles.tabPanel}>
			<EngineEditorLayout.PanelTitle>{panelTitle}</EngineEditorLayout.PanelTitle>
			<EngineEditorLayout.PanelContent className={styles.hierarchyPanelContent}>
				<ul className={styles.worldsEntitiesPanel}>
					{isSuccess && <WorldEntitiesDropdown />}
				</ul>
			</EngineEditorLayout.PanelContent>
		</TabPanel>
	);
};
