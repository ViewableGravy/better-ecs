import { PreviewModeContext } from "@engine/ui/components/previewMode/context";
import { EngineUiContext } from "@engine/ui/utilities/engine-context";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
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

      engine.editor.setPreviewMode(resolvedState);
      return resolvedState;
    });
  };

  useEffect(() => {
    let dragging = false;
    let lastClientX = 0;
    let lastClientY = 0;

    const resolveCanvas = (): HTMLCanvasElement | undefined => {
      try {
        return engine.canvas;
      } catch {
        return undefined;
      }
    };

    const isInsideCanvas = (clientX: number, clientY: number): boolean => {
      const canvas = resolveCanvas();
      if (!canvas) {
        return false;
      }

      const rect = canvas.getBoundingClientRect();

      return (
        clientX >= rect.left
        && clientX <= rect.right
        && clientY >= rect.top
        && clientY <= rect.bottom
      );
    };

    const onMouseDown = (event: MouseEvent): void => {
      if (engine.editor.camera.mode !== "engine") {
        return;
      }

      if (event.button !== 1 || !event.altKey) {
        return;
      }

      if (!isInsideCanvas(event.clientX, event.clientY)) {
        return;
      }

      dragging = true;
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      event.preventDefault();
    };

    const onMouseMove = (event: MouseEvent): void => {
      if (!dragging) {
        return;
      }

      const deltaX = event.clientX - lastClientX;
      const deltaY = event.clientY - lastClientY;

      lastClientX = event.clientX;
      lastClientY = event.clientY;

      const camera = engine.editor.camera;
      const zoom = camera.zoom > 0 ? camera.zoom : 1;
      camera.setPosition(camera.x - deltaX / zoom, camera.y - deltaY / zoom);
    };

    const onMouseUp = (event: MouseEvent): void => {
      if (event.button !== 1) {
        return;
      }

      dragging = false;
    };

    const onWheel = (event: WheelEvent): void => {
      if (engine.editor.camera.mode !== "engine") {
        return;
      }

      if (!isInsideCanvas(event.clientX, event.clientY)) {
        return;
      }

      event.preventDefault();

      const camera = engine.editor.camera;
      const zoomMultiplier = event.deltaY < 0 ? 1.1 : 0.9;
      camera.setZoom(camera.zoom * zoomMultiplier);
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("wheel", onWheel);
    };
  }, [engine]);

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