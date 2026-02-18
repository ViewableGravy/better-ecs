import { useInvariantContext } from "../../../utilities/hooks/use-invariant-context";
import { DropdownContext } from "./context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type ContentProps = {
  children: React.ReactNode;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const Content: React.FC<ContentProps> = ({ children }) => {
  const { isExpanded } = useInvariantContext(DropdownContext);

  if (!isExpanded) {
    return null;
  }

  return <>{children}</>;
};
