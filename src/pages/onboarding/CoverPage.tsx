import { useNavigate } from "react-router";
import { IconArrow } from "@/components/icons/IconArrow";
import { ONBOARD_BLEED, ONBOARD_SAFE_TOP } from "@/lib/onboarding-layout";

/**
 * 产品说明书之后：进入正式界面前，先让设备认识你（校准入口）。
 */
export default function CoverPage() {
  const navigate = useNavigate();
  return (
    <div className={`${ONBOARD_BLEED} bg-[#0c0c0e]`}>
      <img
        src="/brand/attunia-cover.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(12,12,14,0.45) 0%, rgba(12,12,14,0.35) 38%, rgba(12,12,14,0.78) 72%, rgba(12,12,14,0.94) 100%)",
        }}
        aria-hidden
      />

      <div className={`relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-6 ${ONBOARD_SAFE_TOP}`}>
        <p className="text-[12px] font-medium tracking-wide text-white/45">下一步 · 校准</p>
        <h1 className="font-display mt-3 max-w-[15ch] text-[clamp(1.85rem,7.2vw,2.45rem)] leading-[1.08] font-extrabold text-white">
          在正式使用前，
          <br />
          设备需要先
          <span className="mx-1.5 inline-flex h-8 w-14 translate-y-0.5 overflow-hidden rounded-full bg-[#F5E56B] align-middle sm:h-9 sm:w-16">
            <span className="m-auto h-5 w-5 rounded-full bg-ink/90 sm:h-6 sm:w-6" />
          </span>
          认识你
        </h1>
        <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-white/65">
          大约一分钟。戴上 NeuroBand，Attunia 会轻轻记住你的基线——之后推荐练习，才更像是为你而写。
        </p>

        <div className="mt-6 shrink-0 rounded-[22px] border border-white/10 bg-white/8 px-4 py-3.5 backdrop-blur-[2px]">
          <p className="text-[10px] font-semibold tracking-wide text-white/55 uppercase">
            认识你 · 1 分钟
          </p>
          <p className="font-display mt-1 text-lg font-bold text-white sm:text-xl">
            先连上头环，再走校准
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">
            没有头环也能用演示信号体验流程；真机接入后，读数会换成你的实时节奏。
          </p>
        </div>

        <div className="mt-auto space-y-3 pt-5">
          <button
            type="button"
            onClick={() => navigate("/onboarding/device")}
            className="nf-btn-primary flex w-full items-center justify-between !bg-white !py-2 !pr-2 !pl-6 !text-ink"
          >
            <span>开始认识我</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white">
              <IconArrow direction="right" />
            </span>
          </button>

          <details className="group relative text-center">
            <summary className="cursor-pointer list-none text-[12px] tracking-wide text-[#E8C98A]/85 transition hover:text-[#E8C98A]">
              身心放松练习 · 非医疗用途
              <span className="ml-1.5 inline-flex align-middle opacity-70 transition group-open:rotate-90">
                <IconArrow direction="right" className="h-3 w-3" />
              </span>
            </summary>
            <div className="absolute inset-x-0 bottom-full z-20 mb-2 max-h-[42vh] overflow-y-auto rounded-[24px] bg-[#141416]/97 px-4 py-4 text-left shadow-[0_20px_48px_-20px_rgba(0,0,0,0.65)] ring-1 ring-white/12 backdrop-blur-md">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[#E8C98A]/75 uppercase">
                Soft Healthcare · 合规说明
              </p>
              <p className="mt-2.5 text-[13px] leading-[1.65] text-white/88">
                Attunia 提供的是<strong className="font-semibold text-white">冥想与身心状态调节练习</strong>
                ，不构成医疗诊断、治疗或处方建议，不能替代医生或心理咨询师的专业帮助。
              </p>
              <p className="mt-2.5 text-[13px] leading-[1.65] text-white/78">
                如你正经历持续的情绪困扰，请寻求专业机构支持；情况紧急时请拨打全国 24 小时心理援助热线{" "}
                <span className="font-semibold text-white">400-161-9995</span>
                ，或直接拨打 <span className="font-semibold text-white">120</span>。
              </p>
              <p className="mt-2.5 border-t border-white/10 pt-2.5 text-[12px] leading-relaxed text-white/55">
                脑电数据仅在本机处理，真机走本地串口桥，不会上传原始波形；原始脑电也不会送入外部 LLM。
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
