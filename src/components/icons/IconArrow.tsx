/** 全站统一细线箭头（参考：白底圆钮上的黑色线型箭头） */
export type ArrowDir = "left" | "right" | "up" | "down";

const ROTATE: Record<ArrowDir, string> = {
  left: "rotate-0",
  right: "rotate-180",
  up: "rotate-90",
  down: "-rotate-90",
};

export function IconArrow({
  direction = "left",
  className = "h-[18px] w-[18px]",
}: {
  direction?: ArrowDir;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${ROTATE[direction]} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="M11 6 5 12l6 6" />
    </svg>
  );
}

/** 白底圆钮 + 墨色细线箭头，用于返回 / 收起 */
export function IconArrowCircle({
  direction = "left",
  className = "",
  label,
  onClick,
  type = "button",
}: {
  direction?: ArrowDir;
  className?: string;
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_24px_-14px_rgba(17,17,17,0.45)] transition active:scale-[0.98] ${className}`}
    >
      <IconArrow direction={direction} className="h-[18px] w-[18px]" />
    </button>
  );
}
