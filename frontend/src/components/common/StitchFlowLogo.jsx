// frontend/src/components/common/StitchFlowLogo.jsx
import React from 'react';

const StitchFlowLogo = ({ size = 'md', theme = 'dark', showTagline = true }) => {
  const sizes = {
    xs: {
      wrapper: 'w-7 h-7',
      text: 'text-base',
      sub: 'text-[10px]',
      svg: 28,
    },
    sm: {
      wrapper: 'w-9 h-9',
      text: 'text-lg',
      sub: 'text-xs',
      svg: 36,
    },
    md: {
      wrapper: 'w-11 h-11',
      text: 'text-2xl',
      sub: 'text-xs',
      svg: 44,
    },
    lg: {
      wrapper: 'w-14 h-14',
      text: 'text-3xl',
      sub: 'text-sm',
      svg: 56,
    },
    xl: {
      wrapper: 'w-20 h-20',
      text: 'text-4xl',
      sub: 'text-base',
      svg: 80,
    },
  };

  const s = sizes[size];
  const isWhite = theme === 'white';

  return (
    <div className="flex items-center gap-3">
      {/* ── Icon Mark ── */}
      <div className={`${s.wrapper} relative flex-shrink-0`}>
        <svg
          width={s.svg}
          height={s.svg}
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background rounded square */}
          <rect width="44" height="44" rx="12" fill="url(#sf_grad)" />

          {/* ── Fabric Weave Grid (background texture) ── */}
          <rect x="7" y="14" width="4" height="16" rx="2" fill="white" opacity="0.2" />
          <rect x="13" y="14" width="4" height="16" rx="2" fill="white" opacity="0.2" />
          <rect x="19" y="14" width="4" height="16" rx="2" fill="white" opacity="0.2" />
          <rect x="25" y="14" width="4" height="16" rx="2" fill="white" opacity="0.2" />
          <rect x="31" y="14" width="4" height="16" rx="2" fill="white" opacity="0.2" />

          {/* ── Weft threads (horizontal flowing lines) ── */}
          <path
            d="M7 19 C11 17, 15 21, 19 19 C23 17, 27 21, 31 19 C33 18, 35 19, 37 19"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />
          <path
            d="M7 25 C11 23, 15 27, 19 25 C23 23, 27 27, 31 25 C33 24, 35 25, 37 25"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />

          {/* ── Main flowing thread (S-curve = StitchFlow) ── */}
          <path
            d="M8 30 C12 30, 14 22, 18 20 C22 18, 24 26, 28 24 C32 22, 34 16, 37 15"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* ── Needle at the end of thread ── */}
          <circle cx="37" cy="15" r="2.2" fill="white" opacity="0.95" />
          <line
            x1="37" y1="13"
            x2="39" y2="8"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Needle eye hole */}
          <ellipse cx="39" cy="7.5" rx="1.2" ry="0.8"
            fill="none"
            stroke="white"
            strokeWidth="1"
            opacity="0.8"
          />

          {/* ── Cost dot indicators along the curve ── */}
          <circle cx="8"  cy="30" r="2"   fill="white" opacity="0.9" />
          <circle cx="18" cy="20" r="1.8" fill="white" opacity="0.75" />
          <circle cx="28" cy="24" r="1.8" fill="white" opacity="0.75" />

          {/* ── Gradient Definition ── */}
          <defs>
            <linearGradient id="sf_grad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#7C3AED" />
              <stop offset="50%"  stopColor="#6D28D9" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
        </svg>

        {/* Glow ring */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* ── Brand Text ── */}
      <div className="flex flex-col leading-none">
        <span className={`${s.text} font-black tracking-tight leading-none`}>
          <span className={isWhite ? 'text-white' : 'text-gray-900'}>Stitch</span>
          <span
            className={
              isWhite
                ? 'text-purple-300'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600'
            }
          >
            Flow
          </span>
        </span>

        {showTagline && (
          <span
            className={`${s.sub} font-semibold tracking-wide mt-0.5 ${
              isWhite ? 'text-purple-300' : 'text-gray-400'
            }`}
          >
            Pre-Costing Platform
          </span>
        )}
      </div>
    </div>
  );
};

export default StitchFlowLogo;