import { DropdownContext } from "@ui/layout/sidebar/worldViewer/dropdown/context";
import { useState } from "react";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ManagerProps = {
  children: React.ReactNode;
  defaultExpanded?: boolean;
  forceExpanded?: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const Manager: React.FC<ManagerProps> = ({
  children,
  defaultExpanded = false,
  forceExpanded = false,
}) => {
  /***** STATE *****/
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isDerivedExpanded = forceExpanded || isExpanded;

  /***** FUNCTIONS *****/
  const toggle = () => {
    setIsExpanded((current) => !current);
  };

  /***** RENDER *****/
  return (
    <DropdownContext value={{ isExpanded: isDerivedExpanded, toggle }}>
      {children}
    </DropdownContext>
  );
};
