export function Logo({
  size = 32,
  showText = true,
  inverted = false,
}: {
  size?: number;
  showText?: boolean;
  inverted?: boolean;
}) {
  // Use a unique gradient id per instance to avoid SVG conflicts
  const gradId = `logoGrad-${size}`;

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Arrivarangam"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3461" />
            <stop offset="100%" stopColor="#C4882A" />
          </linearGradient>
        </defs>
        {/* Diamond / rhombus shape */}
        <path d="M16 1.5 L30.5 16 L16 30.5 L1.5 16 Z" fill={`url(#${gradId})`} />
        {/* Letter A */}
        <text
          x="16"
          y="21"
          textAnchor="middle"
          fill="white"
          fontSize="13"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          A
        </text>
      </svg>

      {showText && (
        <span
          className={`font-bold text-lg tracking-tight leading-none ${
            inverted ? 'text-white' : 'text-[#0A0D14]'
          }`}
        >
          arrivarangam
        </span>
      )}
    </div>
  );
}
