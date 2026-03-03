import { CullingBoundsIcon } from "@engine/ui/components/icons/cullingBoundsIcon";
import styles from "@engine/ui/layout/quick-actions/styles.module.css";
import { EngineUiContext } from "@engine/ui/utilities/engine-context";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import classNames from "classnames";
import { useSnapshot } from "valtio";

/**********************************************************************************************************
 *   COMPONENT START
 **********************************************************************************************************/
export const CullingBoundsToggle: React.FC = () => {
  const engine = useInvariantContext(EngineUiContext);
  const { showCullingBounds } = useSnapshot(engine.editor.viewState);

  const className = classNames(styles.quickActionButton, {
    [styles.quickActionButtonActive]: showCullingBounds,
  });

  return (
    <button
      aria-label="toggle-culling-bounds"
      aria-pressed={showCullingBounds}
      className={className}
      onClick={() => engine.editor.toggleCullingBoundsVisible()}
      title="toggle-culling-bounds"
      type="button"
    >
      <CullingBoundsIcon className={styles.quickActionIcon} />
    </button>
  );
};
