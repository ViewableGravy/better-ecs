import { TabGroup, TabList, TabPanels } from "@headlessui/react";
import styles from "@ui/layout/sidebar/styles.module.css";
import { HierarchyPanel } from "@ui/layout/sidebar/panels/hierarchy";
import { OtherPanel } from "@ui/layout/sidebar/panels/other";
import { HierarchyTab } from "@ui/layout/sidebar/tabs/hierarchy";
import { OtherTab } from "@ui/layout/sidebar/tabs/other";

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

