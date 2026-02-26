import styles from "@ui/layout/components/styles.module.css";
import type { RegionProps } from "../types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const PanelTitle: React.FC<RegionProps> = ({ children }) => {
  return <h3 className={styles.engineEditorLayoutPanelTitle}>{children}</h3>;
};