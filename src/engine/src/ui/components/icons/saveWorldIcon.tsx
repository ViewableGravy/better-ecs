type SaveWorldIconProps = {
  className?: string;
};

const SAVE_WORLD_ICON_PATH = "M200,80H168V32a8,8,0,0,0-16,0V80H120a8,8,0,0,0-5.66,13.66l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,200,80ZM216,152a8,8,0,0,0-8,8v24H48V160a8,8,0,0,0-16,0v24a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V160A8,8,0,0,0,216,152Z";

export const SaveWorldIcon: React.FC<SaveWorldIconProps> = ({ className }) => {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 256 256" width="22" height="22">
      <path d={SAVE_WORLD_ICON_PATH} fill="currentColor" />
    </svg>
  );
};