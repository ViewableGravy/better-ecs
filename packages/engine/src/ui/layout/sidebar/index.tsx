import { TabGroup, TabList, TabPanels } from "@headlessui/react";
import styles from "./styles.module.css";
import { HierarchyPanel } from "./panels/hierarchy";
import { OtherPanel } from "./panels/other";
import { HierarchyTab } from "./tabs/hierarchy";
import { OtherTab } from "./tabs/other";

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

