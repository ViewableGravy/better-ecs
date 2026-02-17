import { CSSProperties, useCallback } from "react";
import { registerCanvasResize } from "../utilities/attach-canvas";
import { EngineUiContext } from "../utilities/engine-context";
import { useInvariantContext } from "../utilities/hooks/use-invariant-context";


/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type EngineCanvasProps = {
  className?: string;
};

type EngineCanvasComponent = React.FC<EngineCanvasProps>;

const VIEWPORT_WRAPPER_STYLE: CSSProperties = {
  border: "1px solid #353943",
  borderRadius: "8px",
  background: "#1a1d24",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.03)"
};

const CANVAS_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
  display: "block",
  background: "#1a1d24"
};

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const EngineCanvas: EngineCanvasComponent = () => {
  const engine = useInvariantContext(
    EngineUiContext,
    "Engine UI context is missing. Wrap UI with EngineUiContext.",
  );

  /***** HOOKS *****/
  const canvasRefCallback = useCallback((node: HTMLCanvasElement) => {
    const parent = node.parentElement;

    if (!parent) {
      throw new Error("EngineCanvas requires a parent element before ref registration.");
    }

    const resizeRegistration = registerCanvasResize(node, parent);
    engine.setCanvas(node);

    return () => {
      resizeRegistration.dispose();
      engine.removeCanvas(node);
    };
  }, [engine]);

  /***** RENDER *****/
  return (
    <div style={VIEWPORT_WRAPPER_STYLE}>
      <canvas ref={canvasRefCallback} style={CANVAS_STYLE} />
    </div>
  );
};
