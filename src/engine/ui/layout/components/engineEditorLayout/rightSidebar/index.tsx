import styles from "@engine/ui/layout/components/styles.module.css";
import type { RegionProps } from "@engine/ui/layout/components/engineEditorLayout/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const RightSidebar: React.FC<RegionProps> = ({ children }) => {
  return <aside className={styles.engineEditorLayoutRightSidebar}>{children}</aside>;
};