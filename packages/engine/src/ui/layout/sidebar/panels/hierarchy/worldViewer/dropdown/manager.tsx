import { useState } from "react";
import { DropdownContext } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/dropdown/context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ManagerProps = {
  children: React.ReactNode;
  defaultExpanded?: boolean;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const Manager: React.FC<ManagerProps> = ({ children, defaultExpanded = false }) => {
  /***** STATE *****/
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  /***** FUNCTIONS *****/
  const toggle = () => {
    setIsExpanded((current) => !current);
  };

  /***** RENDER *****/
  return (
    <DropdownContext value={{ isExpanded, toggle }}>
      {children}
    </DropdownContext>
  );
};
