import styles from "./styles.module.css";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type WorldEntitiesButtonProps = {
  worldId: string;
  isExpanded: boolean;
  onToggle: () => void;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const WorldEntitiesButton: React.FC<WorldEntitiesButtonProps> = ({
  worldId,
  isExpanded,
  onToggle,
}) => {
  return (
    <button
      aria-expanded={isExpanded}
      className={styles.worldsEntitiesWorldButton}
      onClick={onToggle}
      type="button"
    >
      <span className={styles.worldsEntitiesWorldLabel}>{worldId}</span>
      <span
        aria-hidden="true"
        className={[
          styles.worldsEntitiesWorldChevron,
          isExpanded ? styles.worldsEntitiesWorldChevronExpanded : "",
        ].join(" ")}
      >
        ▾
      </span>
    </button>
  );
};
