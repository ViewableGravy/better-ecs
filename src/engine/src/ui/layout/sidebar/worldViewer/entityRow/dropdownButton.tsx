import classNames from "classnames";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import { Chevron } from "@engine/ui/components/icons/chevron";
import styles from "@engine/ui/layout/sidebar/styles.module.css";
import { Dropdown } from "@engine/ui/layout/sidebar/worldViewer/dropdown";
import { DropdownContext } from "@engine/ui/layout/sidebar/worldViewer/dropdown/context";

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
