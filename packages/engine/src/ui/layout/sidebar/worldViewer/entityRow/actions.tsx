import styles from "../../styles.module.css";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ActionsProps = {
  children: React.ReactNode;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const Actions: React.FC<ActionsProps> = ({ children }) => {
  return <div className={styles.worldsEntitiesEntityActions}>{children}</div>;
};
