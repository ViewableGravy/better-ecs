import { JigsawIcon } from "@engine/ui/components/icons/jigsawIcon";
import styles from "@engine/ui/layout/quick-actions/styles.module.css";
import { EngineUiContext } from "@engine/ui/utilities/engine-context";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import classNames from "classnames";
import { useSnapshot } from "valtio";

export const QuadOutlineToggle: React.FC = () => {
  const engine = useInvariantContext(EngineUiContext);
  const { showQuadOutlines } = useSnapshot(engine.editor.viewState);

  const className = classNames(styles.quickActionButton, {
    [styles.quickActionButtonActive]: showQuadOutlines,
  });

  return (
    <button
      aria-label="toggle-quad-outlines"
      aria-pressed={showQuadOutlines}
      className={className}
      onClick={() => engine.editor.toggleQuadOutlines()}
      title="toggle-quad-outlines (Ctrl+Shift+M)"
      type="button"
    >
      <JigsawIcon className={styles.quickActionIcon} />
    </button>
  );
};
