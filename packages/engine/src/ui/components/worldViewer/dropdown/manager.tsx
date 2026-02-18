import { useState } from "react";
import { DropdownContext } from "./context";

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
export const Manager: React.FC<ManagerProps> = ({ children, defaultExpanded = true }) => {
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
