import styles from "@ui/layout/components/styles.module.css";
import type { RegionProps } from "@ui/layout/components/engineEditorLayout/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const BottomBar: React.FC<RegionProps> = ({ children }) => {
  return <section className={styles.engineEditorLayoutBottomBar}>{children}</section>;
};