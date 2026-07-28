import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useState } from "react";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/
type HandleMouseMove = (event: MouseEvent) => void;

type UseHandleResizeResult = {
  isResizing: boolean;
  handleMouseDown: (event: ReactMouseEvent) => void;
};

/**********************************************************************************************************
 *   HOOK START
 **********************************************************************************************************/
export function useHandleResize(onMouseMove: HandleMouseMove): UseHandleResizeResult {
  const [isResizing, setIsResizing] = useState(false);

  function handleMouseDown(event: ReactMouseEvent): void {
    event.preventDefault();
    setIsResizing(true);
  }

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    function handleMouseUp(): void {
      setIsResizing(false);
      document.body.style.cursor = "auto";
      document.body.style.userSelect = "auto";
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "auto";
      document.body.style.userSelect = "auto";
    };
  }, [isResizing, onMouseMove]);

  return {
    isResizing,
    handleMouseDown,
  };
}