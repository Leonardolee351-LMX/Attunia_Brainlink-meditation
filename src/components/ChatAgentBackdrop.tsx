/**
 * 对话空态智能体背景：纯 CSS/SVG 编码生成，白底柔光，不依赖贴图或视频。
 */
export default function ChatAgentBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {/* 白雾底 + 薄荷/黄油色晕 */}
      <div className="absolute inset-0 bg-[#F6F7F9]" />
      <div
        className="absolute -top-16 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-90"
        style={{
          background:
            "radial-gradient(circle, rgba(184,242,201,0.55) 0%, rgba(245,229,107,0.18) 38%, transparent 68%)",
        }}
      />
      <div
        className="absolute top-[28%] left-[8%] h-40 w-40 rounded-full opacity-70"
        style={{
          background: "radial-gradient(circle, rgba(255,107,74,0.12) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute right-[4%] bottom-[22%] h-48 w-48 rounded-full opacity-80"
        style={{
          background: "radial-gradient(circle, rgba(184,242,201,0.35) 0%, transparent 72%)",
        }}
      />

      {/* 中央智能体：调律环 + 呼吸核 */}
      <div className="absolute top-[18%] left-1/2 h-[240px] w-[240px] -translate-x-1/2">
        <svg viewBox="0 0 240 240" className="h-full w-full">
          <defs>
            <radialGradient id="attunia-core" cx="42%" cy="38%" r="58%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#B8F2C9" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#B8F2C9" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="attunia-arc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5E56B" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FF6B4A" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          <g className="origin-center" style={{ animation: "nf-spin-slow 28s linear infinite" }}>
            <circle
              cx="120"
              cy="120"
              r="92"
              fill="none"
              stroke="#111111"
              strokeOpacity="0.06"
              strokeWidth="1"
              strokeDasharray="4 10"
            />
            <circle
              cx="120"
              cy="120"
              r="72"
              fill="none"
              stroke="#111111"
              strokeOpacity="0.08"
              strokeWidth="1.2"
              strokeDasharray="2 8"
            />
            <path
              d="M48 120a72 72 0 0 1 72-72"
              fill="none"
              stroke="url(#attunia-arc)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M192 120a72 72 0 0 1-72 72"
              fill="none"
              stroke="#B8F2C9"
              strokeOpacity="0.7"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* 节点 */}
            <circle cx="120" cy="28" r="3.5" fill="#F5E56B" />
            <circle cx="212" cy="120" r="3" fill="#FF6B4A" opacity="0.7" />
            <circle cx="120" cy="212" r="3" fill="#B8F2C9" />
            <circle cx="28" cy="120" r="2.5" fill="#111111" opacity="0.25" />
          </g>

          <g className="nf-breathe origin-center">
            <circle cx="120" cy="120" r="46" fill="url(#attunia-core)" />
            <circle
              cx="120"
              cy="120"
              r="22"
              fill="#ffffff"
              fillOpacity="0.55"
              stroke="#111111"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            {/* 简约大脑/灵智符号：交叉调律弧 */}
            <path
              d="M106 118c4-10 12-16 22-16s18 6 22 16"
              fill="none"
              stroke="#111111"
              strokeOpacity="0.35"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M108 126c6 8 14 12 20 12s14-4 20-12"
              fill="none"
              stroke="#111111"
              strokeOpacity="0.22"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="120" cy="120" r="3.2" fill="#111111" fillOpacity="0.55" />
          </g>

          {/* 外层慢晕 */}
          <circle
            cx="120"
            cy="120"
            r="104"
            fill="none"
            stroke="#B8F2C9"
            strokeOpacity="0.35"
            strokeWidth="18"
            className="nf-halo origin-center"
            style={{ transformOrigin: "120px 120px" }}
          />
        </svg>
      </div>

      {/* 细雾颗粒感 */}
      <div
        className="absolute inset-0 opacity-[0.35] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
