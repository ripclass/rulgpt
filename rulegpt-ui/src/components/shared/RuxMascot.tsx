interface RuxMascotProps {
  pose?: 'default' | 'reading' | 'searching' | 'found' | 'empty' | 'loading'
  size?: number
  className?: string
}

export function RuxMascot({ size = 48, className = '' }: RuxMascotProps) {
  // Legacy mascot has been completely removed in favor of the new sleek geometric logo.
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TFRules Logo"
    >
      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#FF4F00" />
      <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#FF4F00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Small nav mark
export function RuxMark({ className = '' }: { className?: string }) {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="tfrules"
    >
      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#FF4F00" />
      <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#FF4F00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
