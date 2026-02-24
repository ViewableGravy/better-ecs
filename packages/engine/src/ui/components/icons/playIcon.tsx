type PlayIconProps = {
  className?: string;
};

const PLAY_ICON_PATH = "M80 56v144l112-72L80 56z";

export const PlayIcon: React.FC<PlayIconProps> = ({ className }) => {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 256 256" width="22" height="22">
      <path d={PLAY_ICON_PATH} fill="currentColor" />
    </svg>
  );
};
