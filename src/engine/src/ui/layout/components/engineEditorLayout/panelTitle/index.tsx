import styles from "@engine/ui/layout/components/styles.module.css";
import type { RegionProps } from "@engine/ui/layout/components/engineEditorLayout/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const PanelTitle: React.FC<RegionProps> = ({ children }) => {
  return <h3 className={styles.engineEditorLayoutPanelTitle}>{children}</h3>;
};