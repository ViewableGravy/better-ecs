type PreviewCloseIconProps = {
  className?: string;
};

const PREVIEW_CLOSE_ICON_PATH = "M152,96V48a8,8,0,0,1,16,0V88h40a8,8,0,0,1,0,16H160A8,8,0,0,1,152,96ZM96,152H48a8,8,0,0,0,0,16H88v40a8,8,0,0,0,16,0V160A8,8,0,0,0,96,152Zm112,0H160a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V168h40a8,8,0,0,0,0-16ZM96,40a8,8,0,0,0-8,8V88H48a8,8,0,0,0,0,16H96a8,8,0,0,0,8-8V48A8,8,0,0,0,96,40Z";

export const PreviewCloseIcon: React.FC<PreviewCloseIconProps> = ({ className }) => {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 256 256" width="22" height="22">
      <path d={PREVIEW_CLOSE_ICON_PATH} fill="currentColor" />
    </svg>
  );
};
