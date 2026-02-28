import styles from "@ui/layout/components/styles.module.css";
import classNames from "classnames";
import type { RegionProps } from "@ui/layout/components/engineEditorLayout/types";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const PanelContent: React.FC<RegionProps> = ({ children, className }) => {
  const panelContentClassName = classNames(styles.engineEditorLayoutPanelContent, className);

  return <div className={panelContentClassName}>{children}</div>;
};