import { JigsawIcon } from "@ui/components/icons/jigsawIcon";
import styles from "@ui/layout/quick-actions/styles.module.css";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
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
