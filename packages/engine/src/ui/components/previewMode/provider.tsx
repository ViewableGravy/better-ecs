import { ReactNode, useEffect, useState } from "react";
import { PreviewModeContext } from "./context";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

type PreviewModeProviderProps = {
  children?: ReactNode;
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/

export const PreviewModeProvider: React.FC<PreviewModeProviderProps> = ({ children }) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    if (!isPreviewMode) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      setIsPreviewMode(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPreviewMode]);

  return <PreviewModeContext value={[isPreviewMode, setIsPreviewMode]}>{children}</PreviewModeContext>;
};