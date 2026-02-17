import { useCallback } from "react";
import { registerCanvasResize } from "../utilities/attach-canvas";
import { EngineUiContext } from "../utilities/engine-context";
import { useInvariantContext } from "../utilities/hooks/use-invariant-context";
import styles from "./styles.module.css";

/**********************************************************************************************************
 *   TYPE DEFINITIONS
 **********************************************************************************************************/

export type EngineCanvasProps = {
  className?: string;
};

type EngineCanvasComponent = React.FC<EngineCanvasProps>;

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
    <div className={styles.engineCanvasViewportWrapper}>
      <canvas ref={canvasRefCallback} className={styles.engineCanvas} />
    </div>
  );
};
