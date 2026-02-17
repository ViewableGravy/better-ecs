import { Activity, memo, useState } from "react";
import styles from "./styles.module.css";
import { WorldEntitiesButton } from "./world-entities-button";
import { WorldEntitiesDropdown } from "./world-entities-dropdown";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type WorldEntitiesItemProps = {
  worldId: string;
};

const WorldEntitiesItemBase: React.FC<WorldEntitiesItemProps> = ({ worldId }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className={styles.worldsEntitiesWorldSection}>
      <WorldEntitiesButton
        worldId={worldId}
        isExpanded={isExpanded}
        onToggle={() => {
          setIsExpanded((previousValue) => !previousValue);
        }}
      />
      <Activity mode={isExpanded ? "visible" : "hidden"} >
        <WorldEntitiesDropdown worldId={worldId} />
      </Activity>
    </section>
  );
};

export const WorldEntitiesItem = memo(WorldEntitiesItemBase);
