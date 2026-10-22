export function BrandLogo({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "sm" ? "w-7 h-7" : size === "lg" ? "w-12 h-12" : "w-9 h-9";
  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";
  const subSize = size === "sm" ? "text-[8px]" : size === "lg" ? "text-[10px]" : "text-[9px]";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* aXtrLabs Official Black Square Monogram Badge */}
      <div
        className={`${iconSize} rounded-lg bg-black border border-white/20 flex items-center justify-center p-1 shadow-lg shadow-black/60 relative overflow-hidden shrink-0`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-white fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stylized aXtr Letterforms */}
          <g fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
            {/* 'a' flourish */}
            <path d="M 22 52 C 22 42, 34 40, 36 50 C 36 60, 20 62, 20 70 C 20 76, 28 80, 36 76 L 36 50" />
            
            {/* 'X' dominant diagonals */}
            <line x1="32" y1="32" x2="68" y2="76" strokeWidth="8" />
            <line x1="68" y1="32" x2="32" y2="76" strokeWidth="8" />
            
            {/* Top and bottom cross serifs */}
            <line x1="28" y1="32" x2="38" y2="32" strokeWidth="5" />
            <line x1="62" y1="32" x2="72" y2="32" strokeWidth="5" />
            <line x1="28" y1="76" x2="38" y2="76" strokeWidth="5" />
            <line x1="62" y1="76" x2="72" y2="76" strokeWidth="5" />

            {/* 't' & 'r' accent */}
            <line x1="72" y1="42" x2="72" y2="68" strokeWidth="5" />
            <path d="M 66 50 L 78 50" strokeWidth="5" />
            <path d="M 72 54 C 76 48, 86 48, 88 54" strokeWidth="5" />
          </g>
        </svg>
      </div>

      {/* Brand Wordmark & Tagline */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className={`font-black tracking-tight text-white ${textSize}`}>
            aXtr<span className="text-zinc-400 font-semibold">Labs</span>
          </span>
        </div>
        <span className={`uppercase font-bold tracking-widest text-zinc-400 ${subSize} mt-0.5`}>
          THE AI COMPANY
        </span>
      </div>
    </div>
  );
}
