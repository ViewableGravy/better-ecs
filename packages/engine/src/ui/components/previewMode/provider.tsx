import { PreviewModeContext } from "@ui/components/previewMode/context";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import { ReactNode, useEffect, useState, type Dispatch, type SetStateAction } from "react";

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
  const engine = useInvariantContext(EngineUiContext);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const setPreviewMode: Dispatch<SetStateAction<boolean>> = (nextState) => {
    setIsPreviewMode((currentState) => {
      const resolvedState =
        typeof nextState === "function" ? nextState(currentState) : nextState;

      engine.setPreviewMode(resolvedState);
      return resolvedState;
    });
  };

  useEffect(() => {
    if (!isPreviewMode) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      setPreviewMode(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isPreviewMode]);

  return <PreviewModeContext value={[isPreviewMode, setPreviewMode]}>{children}</PreviewModeContext>;
};