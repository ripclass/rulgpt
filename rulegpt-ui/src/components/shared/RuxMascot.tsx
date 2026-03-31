interface RuxMascotProps {
  pose?: 'default' | 'reading' | 'searching' | 'found' | 'empty' | 'loading'
  size?: number
  className?: string
}

export function RuxMascot({ pose = 'default', size = 48, className = '' }: RuxMascotProps) {
  // All poses use placeholder SVG for now.
  // When real Rux art arrives, swap SVG content per pose.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`Rux the axolotl — ${pose}`}
    >
      {/* Body */}
      <ellipse cx="24" cy="28" rx="14" ry="11" fill="#D97706" />
      {/* Head */}
      <circle cx="24" cy="18" r="10" fill="#D97706" />
      {/* Left gill frond */}
      <ellipse cx="14" cy="12" rx="3" ry="7" fill="#B45309" transform="rotate(-20 14 12)" />
      {/* Middle gill frond */}
      <ellipse cx="24" cy="9" rx="3" ry="7" fill="#B45309" />
      {/* Right gill frond */}
      <ellipse cx="34" cy="12" rx="3" ry="7" fill="#B45309" transform="rotate(20 34 12)" />
      {/* Eyes */}
      <circle cx="20" cy="17" r="2.5" fill="#0A0A0A" />
      <circle cx="28" cy="17" r="2.5" fill="#0A0A0A" />
      {/* Eye shine */}
      <circle cx="21" cy="16" r="0.8" fill="white" />
      <circle cx="29" cy="16" r="0.8" fill="white" />
      {/* Smile */}
      <path d="M20 22 Q24 25 28 22" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Small legs */}
      <ellipse cx="13" cy="36" rx="4" ry="2.5" fill="#B45309" transform="rotate(-30 13 36)" />
      <ellipse cx="35" cy="36" rx="4" ry="2.5" fill="#B45309" transform="rotate(30 35 36)" />
    </svg>
  )
}

// Small nav mark — head only, 24px
export function RuxMark({ className = '' }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 48 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="tfrules"
    >
      <ellipse cx="14" cy="8" rx="3" ry="7" fill="#B45309" transform="rotate(-20 14 8)" />
      <ellipse cx="24" cy="5" rx="3" ry="7" fill="#B45309" />
      <ellipse cx="34" cy="8" rx="3" ry="7" fill="#B45309" transform="rotate(20 34 8)" />
      <circle cx="24" cy="18" r="10" fill="#D97706" />
      <circle cx="20" cy="17" r="2.5" fill="#0A0A0A" />
      <circle cx="28" cy="17" r="2.5" fill="#0A0A0A" />
      <circle cx="21" cy="16" r="0.8" fill="white" />
      <circle cx="29" cy="16" r="0.8" fill="white" />
      <path d="M20 22 Q24 25 28 22" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}
