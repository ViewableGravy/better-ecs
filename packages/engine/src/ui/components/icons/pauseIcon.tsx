type PauseIconProps = {
  className?: string;
};

export const PauseIcon: React.FC<PauseIconProps> = ({ className }) => {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 256 256" width="22" height="22">
      <rect x="72" y="56" width="40" height="144" rx="8" fill="currentColor" />
      <rect x="144" y="56" width="40" height="144" rx="8" fill="currentColor" />
    </svg>
  );
};
