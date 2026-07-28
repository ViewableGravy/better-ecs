import styles from "@engine/ui/layout/components/styles.module.css";
import type { RegionProps } from "@engine/ui/layout/components/engineEditorLayout/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const LeftSidebar: React.FC<RegionProps> = ({ children }) => {
  return <aside className={styles.engineEditorLayoutLeftSidebar}>{children}</aside>;
};