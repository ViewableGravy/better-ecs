type ReloadCanvasIconProps = {
  className?: string;
};

const RELOAD_CANVAS_ICON_PATH = "M128,24A104,104,0,1,0,232,128a8,8,0,0,0-16,0,88,88,0,1,1-26.68-62.63H200a8,8,0,0,0,0-16H168a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V78.2A103.78,103.78,0,0,0,128,24Z";

export const ReloadCanvasIcon: React.FC<ReloadCanvasIconProps> = ({ className }) => {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 256 256" width="22" height="22">
      <path d={RELOAD_CANVAS_ICON_PATH} fill="currentColor" />
    </svg>
  );
};
