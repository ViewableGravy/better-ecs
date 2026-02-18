import type { CSSProperties, KeyboardEvent } from "react";
import { useInvariantContext } from "../../../utilities/hooks/use-invariant-context";
import { DropdownContext } from "./context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ToggleButtonProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  style?: CSSProperties;
  ariaExpanded?: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const ToggleButton: React.FC<ToggleButtonProps> = ({
  children,
  className,
  disabled = false,
  style,
  ariaExpanded,
}) => {
  /***** HOOKS *****/
  const { toggle } = useInvariantContext(DropdownContext);

  /***** FUNCTIONS *****/
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  };

  /***** RENDER *****/
  return (
    <div
      aria-expanded={ariaExpanded}
      className={className}
      onClick={disabled ? undefined : toggle}
      onKeyDown={onKeyDown}
      role={disabled ? undefined : "button"}
      style={style}
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </div>
  );
};
