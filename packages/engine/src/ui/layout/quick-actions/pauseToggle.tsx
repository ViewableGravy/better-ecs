import classNames from "classnames";
import { useSnapshot } from "valtio";
import { PauseIcon } from "@ui/components/icons/pauseIcon";
import { PlayIcon } from "@ui/components/icons/playIcon";
import { EngineUiContext } from "@ui/utilities/engine-context";
import { useInvariantContext } from "@ui/utilities/hooks/use-invariant-context";
import styles from "@ui/layout/quick-actions/styles.module.css";

export const PauseToggle: React.FC = () => {
  const engine = useInvariantContext(EngineUiContext);
  const { paused } = useSnapshot(engine.runningState);
  
  const Icon = paused ? PlayIcon : PauseIcon;
  const className = classNames(styles.quickActionButton, {
    [styles.quickActionButtonActive]: paused,
  });

  return (
    <button
      aria-label={paused ? "resume-engine" : "pause-engine"}
      aria-pressed={paused}
      className={className}
      onClick={() => engine.runningState.toggle()}
      title={paused ? "resume-engine" : "pause-engine"}
      type="button"
    >
      <Icon className={styles.quickActionIcon} />
    </button>
  );
};
