import { TabGroup, TabList, TabPanels } from "@headlessui/react";
import styles from "@engine/ui/layout/sidebar/styles.module.css";
import { HierarchyPanel } from "@engine/ui/layout/sidebar/panels/hierarchy";
import { OtherPanel } from "@engine/ui/layout/sidebar/panels/other";
import { HierarchyTab } from "@engine/ui/layout/sidebar/tabs/hierarchy";
import { OtherTab } from "@engine/ui/layout/sidebar/tabs/other";

/***** COMPONENT START *****/
export const LeftSidebar: React.FC = () => {
	return (
		<TabGroup className={styles.tabsRoot}>
			<TabPanels className={styles.tabPanels}>
				<HierarchyPanel />
				<OtherPanel />
			</TabPanels>

			<TabList className={styles.tabList}>
				<HierarchyTab />
				<OtherTab />
			</TabList>
		</TabGroup>
	);
};

