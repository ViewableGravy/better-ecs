import { TabPanel } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import { EngineEditorLayout } from "@ui/layout/components/engineEditorLayout/index";
import {
	createHierarchyTreeQueryOptions,
	type HierarchyTreeSnapshot,
} from "@ui/layout/sidebar/panels/hierarchy/queries/hierarchyTreeQuery";
import { WorldEntitiesDropdown } from "@ui/layout/sidebar/panels/hierarchy/components/worldEntitiesDropdown";
import styles from "@ui/layout/sidebar/styles.module.css";
import { WorldIdContext } from "@ui/layout/sidebar/worldViewer/context";
import { Dropdown } from "@ui/layout/sidebar/worldViewer/dropdown";
import { EntityRow } from "@ui/layout/sidebar/worldViewer/entityRow";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
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
				activeWorldId: tree.activeWorldId,
				worldIds: tree.worldIds,
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
					{isSuccess &&
						data.worldIds.map((worldId) => (
							<WorldIdContext key={worldId} value={worldId}>
								<li className={styles.worldsEntitiesEntityItem}>
									<Dropdown.Manager defaultExpanded={worldId === data.activeWorldId}>
										<EntityRow.DropdownButton depth={0} hasContent>
											<EntityRow.Root>
												<EntityRow.Icon.World />
												<span className={styles.worldsEntitiesEntityName}>{worldId}</span>
											</EntityRow.Root>
										</EntityRow.DropdownButton>
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
