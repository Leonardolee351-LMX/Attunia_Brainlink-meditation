/**
 * 合规文案组件:免责声明 + 危机转介。
 *
 * 训练入口 / 正式播放页：用 ComplianceDisclosure（icon 渐进披露），
 * 不要每次开练都强制勾选，以免打断体验。
 */

/** 标准免责声明(细字版) */
export function ComplianceFinePrint({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[10px] leading-relaxed text-ink/35 ${className}`}>
      Attunia 提供的是身心状态调节与放松练习,不构成医疗诊断、治疗或处方建议,
      不能替代医生或心理咨询师的专业帮助。演示数据为本地模拟信号,不会上传。
      如果你正经历持续的情绪困扰,请寻求专业机构的支持。
    </p>
  );
}

const NOTICE_BODY =
  "这是一段放松与状态调节练习，不是医疗手段。练习中如有任何不适，请随时停下来。孕期、有癫痫史或严重心血管状况者，请先咨询医生再进行呼吸类练习。Attunia 不构成医疗诊断或处方建议。";

/** 训练单元 / 播放页：ⓘ icon 渐进披露免责，不阻断开始 */
export function ComplianceDisclosure({
  tone = "light",
  className = "",
  placement,
}: {
  tone?: "light" | "dark";
  className?: string;
  /** 气泡方向：单元页向下，播放页向上 */
  placement?: "up" | "down";
}) {
  const dark = tone === "dark";
  const side = placement ?? (dark ? "up" : "down");
  return (
    <details className={`group relative ${className}`}>
      <summary
        className={`flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-[13px] font-semibold transition ${
          dark
            ? "bg-white/12 text-white/70 ring-1 ring-white/15 hover:bg-white/18"
            : "bg-ink/6 text-ink/45 hover:bg-ink/10"
        }`}
        aria-label="查看免责声明"
        title="免责声明"
      >
        <span aria-hidden>ⓘ</span>
      </summary>
      <div
        className={`absolute z-30 w-[min(288px,calc(100vw-2.5rem))] rounded-[16px] px-3.5 py-3 text-[11px] leading-relaxed shadow-[0_12px_32px_-14px_rgba(0,0,0,0.35)] ${
          side === "up" ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2"
        } ${
          dark ? "bg-[#1a1a1e] text-white/75 ring-1 ring-white/12" : "bg-white text-ink/60 ring-1 ring-ink/8"
        }`}
      >
        {NOTICE_BODY}
      </div>
    </details>
  );
}

/** @deprecated 改用 ComplianceDisclosure */
export function PreSessionNotice({
  acknowledged,
  onAcknowledge,
  tone = "light",
}: {
  acknowledged: boolean;
  onAcknowledge: () => void;
  tone?: "light" | "dark";
}) {
  void acknowledged;
  void onAcknowledge;
  return <ComplianceDisclosure tone={tone} className="mx-auto mt-3 flex justify-center" />;
}

const CRISIS_WORDS = [
  "自杀",
  "不想活",
  "活不下去",
  "轻生",
  "自残",
  "自伤",
  "伤害自己",
  "想死",
  "结束生命",
  "结束一切",
  "撑不下去",
  "跳下去",
  "死了更好",
  "遗书",
  "浪费空气",
  "不需要我",
  "消失才不会",
  "就解脱了",
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  if (CRISIS_WORDS.some((w) => text.includes(w))) return true;
  if (/死了.{0,6}更好/.test(text)) return true;
  return false;
}

export function CrisisResourceCard() {
  return (
    <div className="rounded-2xl border border-clay/30 bg-[#faf5ef] p-5">
      <p className="text-sm leading-relaxed text-ink/80">
        听到你这么说,我很在意你此刻的状态。
        我只是一个陪伴练习的小助手,这种情况下,你值得被更专业的人好好接住。
      </p>
      <div className="mt-3 space-y-2 text-xs leading-relaxed text-ink/65">
        <div className="flex justify-between">
          <span>全国 24 小时心理援助热线</span>
          <span className="font-medium text-ink">400-161-9995</span>
        </div>
        <div className="flex justify-between">
          <span>北京心理危机研究与干预中心</span>
          <span className="font-medium text-ink">010-82951332</span>
        </div>
        <div className="flex justify-between">
          <span>生命热线(24 小时)</span>
          <span className="font-medium text-ink">400-821-1215</span>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-ink/40">
        如果情况紧急,请直接拨打 120 或前往就近医院急诊。你不是一个人。
      </p>
    </div>
  );
}
