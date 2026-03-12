/**
 * Abstract Brush-Stroke Logo — ensō circle with bottle silhouette.
 */
export function BrushLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ensō / Brush Circle */}
      <path
        d="M85 50C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15C58 15 65 18 71 23"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Secondary brush tail */}
      <path
        d="M74 27C78 32 81 40 81 50C81 67.1208 67.1208 81 50 81"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Bottle silhouette */}
      <path
        d="M48 35C48 35 45 38 45 45V65C45 68 47 70 50 70C53 70 55 68 55 65V45C55 38 52 35 52 35"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M50 28V33"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Splatter accents */}
      <circle cx="28" cy="22" r="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="78" cy="72" r="1" fill="currentColor" opacity="0.3" />
      <circle cx="22" cy="65" r="0.8" fill="currentColor" opacity="0.2" />
    </svg>
  );
}
