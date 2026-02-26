import styles from "@ui/layout/components/styles.module.css";
import type { RegionProps } from "../types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const LeftSidebar: React.FC<RegionProps> = ({ children }) => {
  return <aside className={styles.engineEditorLayoutLeftSidebar}>{children}</aside>;
};