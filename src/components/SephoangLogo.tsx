import React from 'react';

interface SephoangLogoProps {
  className?: string;
  size?: number | string;
}

export const SephoangLogo: React.FC<SephoangLogoProps> = ({
  className = 'w-10 h-10',
}) => {
  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-lg border border-slate-700/80 bg-white flex items-center justify-center shrink-0 select-none ${className}`}
      title="SEPHOANG_93"
    >
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full p-0.5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background square */}
        <rect width="500" height="500" fill="#FFFFFF" />

        {/* Big Block S (Left) */}
        <path
          d="M 35 60 L 245 60 L 245 190 L 140 190 L 140 230 L 245 255 L 245 440 L 35 440 L 35 310 L 140 310 L 140 270 L 35 245 Z"
          fill="#0a0a0a"
        />

        {/* Big Block H (Right) */}
        <path
          d="M 260 60 L 360 60 L 360 215 L 395 215 L 395 60 L 475 60 L 475 440 L 395 440 L 395 285 L 360 285 L 360 440 L 260 440 Z"
          fill="#0a0a0a"
        />

        {/* Central Overlay Athletic Cut Number 9 and 3 in Dark Gray */}
        {/* Number 9 */}
        <path
          d="M 155 215 L 235 215 L 235 375 L 155 375 L 155 335 L 200 335 L 200 305 L 155 305 Z M 185 245 L 205 245 L 205 275 L 185 275 Z"
          fill="#525252"
          fillRule="evenodd"
        />

        {/* Number 3 */}
        <path
          d="M 265 215 L 345 215 L 345 375 L 265 375 L 265 338 L 315 338 L 315 310 L 280 310 L 280 280 L 315 280 L 315 252 L 265 252 Z"
          fill="#525252"
        />
      </svg>
    </div>
  );
};
