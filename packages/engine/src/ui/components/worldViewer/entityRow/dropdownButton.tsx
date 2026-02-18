import classNames from "classnames";
import { useInvariantContext } from "../../../utilities/hooks/use-invariant-context";
import { Chevron } from "../../icons/chevron";
import styles from "../../styles.module.css";
import { Dropdown } from "../dropdown";
import { DropdownContext } from "../dropdown/context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type DropdownButtonProps = {
  children: React.ReactNode;
  depth: number;
  hasContent: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const DropdownButton: React.FC<DropdownButtonProps> = ({ children, depth, hasContent }) => {
  const { isExpanded } = useInvariantContext(DropdownContext);

  const className = classNames(styles.worldsEntitiesEntityToggleButton);

  return (
    <Dropdown.Toggle.Button
      ariaExpanded={hasContent ? isExpanded : undefined}
      className={className}
      disabled={!hasContent}
      style={{ paddingLeft: `${8 + depth * 8}px` }}
    >
      <Chevron direction={isExpanded ? "down" : "right"} isHidden={!hasContent} />
      {children}
    </Dropdown.Toggle.Button>
  );
};
