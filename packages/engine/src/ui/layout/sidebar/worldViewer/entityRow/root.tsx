import styles from "@ui/layout/sidebar/styles.module.css";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type RootProps = {
  children: React.ReactNode;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const Root: React.FC<RootProps> = ({ children }) => {
  return <div className={styles.worldsEntitiesEntityRow}>{children}</div>;
};
