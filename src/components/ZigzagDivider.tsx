import { memo } from "react";

interface ZigzagDividerProps {
  height?: number;
  className?: string;
}

const ZigzagDivider = memo(function ZigzagDivider({ height = 20, className = "" }: ZigzagDividerProps) {
  return (
    <div className={`w-full overflow-hidden ${className}`} style={{ height }}>
      <svg
        width="100%"
        height={height}
        preserveAspectRatio="none"
        viewBox={`0 0 100 ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="zigzagPattern"
            x="0"
            y="0"
            width="20"
            height={height}
            patternUnits="userSpaceOnUse"
          >
            <polygon
              points={`0,${height} 5,0 10,${height} 15,0 20,${height}`}
              fill="#3D2E22"
            />
            <polygon
              points={`2,${height} 7,${height * 0.6} 12,${height} 17,${height * 0.6} 22,${height}`}
              fill="#C75C2E"
              opacity="0.6"
            />
          </pattern>
        </defs>
        <rect width="100%" height={height} fill="url(#zigzagPattern)" />
      </svg>
    </div>
  );
});

export default ZigzagDivider;
