type CullingBoundsIconProps = {
  className?: string;
};

const CULLING_BOUNDS_ICON_PATH = "M216,48V88a8,8,0,0,1-16,0V56H168a8,8,0,0,1,0-16h40A8,8,0,0,1,216,48ZM88,200H56V168a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H88a8,8,0,0,0,0-16Zm120-40a8,8,0,0,0-8,8v32H168a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V168A8,8,0,0,0,208,160ZM88,40H48a8,8,0,0,0-8,8V88a8,8,0,0,0,16,0V56H88a8,8,0,0,0,0-16Z";
const CULLING_BOUNDS_X_PATH = "M232,60.69,219.31,48,232,35.31a8,8,0,0,0-11.31-11.31L208,36.69,195.31,24a8,8,0,0,0-11.31,11.31L196.69,48,184,60.69A8,8,0,0,0,195.31,72L208,59.31,220.69,72A8,8,0,0,0,232,60.69Z";

export const CullingBoundsIcon: React.FC<CullingBoundsIconProps> = ({ className }) => {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 256 256" width="22" height="22">
      <path d={CULLING_BOUNDS_ICON_PATH} fill="currentColor" />
      <path d={CULLING_BOUNDS_X_PATH} fill="currentColor" />
    </svg>
  );
};
