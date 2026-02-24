import { useInvariantContext } from "@ui/layout/sidebar/utilities/hooks/use-invariant-context";
import { DropdownContext } from "@ui/layout/sidebar/panels/hierarchy/worldViewer/dropdown/context";

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
