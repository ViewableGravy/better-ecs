import { PauseIcon } from "@engine/ui/components/icons/pauseIcon";
import { PlayIcon } from "@engine/ui/components/icons/playIcon";
import styles from "@engine/ui/layout/quick-actions/styles.module.css";
import { EngineUiContext } from "@engine/ui/utilities/engine-context";
import { useInvariantContext } from "@engine/ui/utilities/hooks/use-invariant-context";
import classNames from "classnames";
import { useSnapshot } from "valtio";

export const PauseToggle: React.FC = () => {
  const engine = useInvariantContext(EngineUiContext);
  const { paused } = useSnapshot(engine.editor.runningState);
  
  const Icon = paused ? PlayIcon : PauseIcon;
  const className = classNames(styles.quickActionButton, {
    [styles.quickActionButtonActive]: paused,
  });

  return (
    <button
      aria-label={paused ? "resume-engine" : "pause-engine"}
      aria-pressed={paused}
      className={className}
      onClick={() => engine.editor.runningState.toggle()}
      title={paused ? "resume-engine" : "pause-engine"}
      type="button"
    >
      <Icon className={styles.quickActionIcon} />
    </button>
  );
};
