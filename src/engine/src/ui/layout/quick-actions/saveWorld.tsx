import { SaveWorldIcon } from "@engine/ui/components/icons/saveWorldIcon";
import styles from "@engine/ui/layout/quick-actions/styles.module.css";
import { EngineUiContext } from "@engine/ui/utilities/engine-context";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";

const SAVE_WORLD_LABEL = "save-world-state";

export const SaveWorld: React.FC = () => {
  const engine = useInvariantContext(
    EngineUiContext,
    "Engine UI context is missing. Wrap UI with EngineUiContext.",
  );

  return (
    <button
      aria-label={SAVE_WORLD_LABEL}
      className={styles.quickActionButton}
      onClick={() => engine.editor.downloadWorldSnapshot()}
      title={SAVE_WORLD_LABEL}
      type="button"
    >
      <SaveWorldIcon className={styles.quickActionIcon} />
    </button>
  );
};