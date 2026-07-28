type ReloadEngineIconProps = {
  className?: string;
};

const RELOAD_RING_ICON_PATH = "M128,24A104,104,0,1,0,232,128a8,8,0,0,0-16,0,88,88,0,1,1-26.68-62.63H200a8,8,0,0,0,0-16H168a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V78.2A103.78,103.78,0,0,0,128,24Z";
const ENGINE_GLYPH_PATH = "M240,104H227.31L192,68.69A15.86,15.86,0,0,0,180.69,64H140V40h24a8,8,0,0,0,0-16H100a8,8,0,0,0,0,16h24V64H64A16,16,0,0,0,48,80v52H24V108a8,8,0,0,0-16,0v64a8,8,0,0,0,16,0V148H48v20.69A15.86,15.86,0,0,0,52.69,180L92,219.31A15.86,15.86,0,0,0,103.31,224h77.38A15.86,15.86,0,0,0,192,219.31L227.31,184H240a16,16,0,0,0,16-16V120A16,16,0,0,0,240,104Zm0,64H224a8,8,0,0,0-5.66,2.34L180.69,208H103.31L64,168.69V80H180.69l37.65,37.66A8,8,0,0,0,224,120h16Z";

export const ReloadEngineIcon: React.FC<ReloadEngineIconProps> = ({ className }) => {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 256 256" width="22" height="22">
      <path d={RELOAD_RING_ICON_PATH} fill="currentColor" />
      <g transform="translate(152 20) scale(0.40)">
        <path
          d={ENGINE_GLYPH_PATH}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
