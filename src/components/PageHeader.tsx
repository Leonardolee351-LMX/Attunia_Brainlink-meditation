export default function PageHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="pb-5">
      {kicker ? <p className="text-[13px] font-medium text-ink/45">{kicker}</p> : null}
      <h1 className="font-display mt-1 text-[1.75rem] leading-[1.15] font-extrabold text-ink">{title}</h1>
      {subtitle ? (
        <p className="mt-2 max-w-[38ch] text-[14px] leading-relaxed text-ink/50">{subtitle}</p>
      ) : null}
    </header>
  );
}
