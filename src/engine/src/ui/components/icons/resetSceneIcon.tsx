type ResetSceneIconProps = {
  className?: string;
};

const RESET_RING_ICON_PATH = "M128,32a96,96,0,1,0,88.51,133.28,8,8,0,0,0-14.75-6.21A80,80,0,1,1,184.57,74H160a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V42a8,8,0,0,0-16,0V62.13A95.62,95.62,0,0,0,128,32Z";
const RESET_X_PATH = "M160.49,95.51a8,8,0,0,0-11.32,0L128,116.69,106.83,95.51a8,8,0,0,0-11.32,11.32L116.69,128,95.51,149.17a8,8,0,1,0,11.32,11.32L128,139.31l21.17,21.18a8,8,0,0,0,11.32-11.32L139.31,128l21.18-21.17A8,8,0,0,0,160.49,95.51Z";

export const ResetSceneIcon: React.FC<ResetSceneIconProps> = ({ className }) => {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 256 256" width="22" height="22">
      <path d={RESET_RING_ICON_PATH} fill="currentColor" />
      <path d={RESET_X_PATH} fill="currentColor" />
    </svg>
  );
};