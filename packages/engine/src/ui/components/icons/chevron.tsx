import classNames from "classnames";
import styles from "../styles.module.css";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ChevronProps = {
  direction: "down" | "right";
  isHidden?: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const Chevron: React.FC<ChevronProps> = ({ direction, isHidden = false }) => {
  /***** RENDER HELPERS *****/
  const className = classNames(
    styles.worldsEntitiesEntityChevron,
    {
      [styles.worldsEntitiesEntityChevronExpanded]: direction === "down",
      [styles.worldsEntitiesEntityChevronHidden]: isHidden,
    }
  );

  /***** RENDER *****/
  return (
    <span aria-hidden="true" className={className}>
      ▾
    </span>
  );
};
