/**
 * 工作室画板：iPhone 逻辑画幅，较小 Dynamic Island + 底部 Home Indicator。
 * 机框外最左：开屏 / 提醒机制 / 模拟脑电；最右：演示时间轴（Explore / Scene）。
 * 机框内顶部：工作态提醒信息条（WorkReminderBar）。
 * 开屏流程锁滚 + 路由轻量入场（Premium decelerate）。
 * 顶垫 sm:pt-[44px] 须与 src/lib/onboarding-layout.ts 出血常量同步。
 */
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import BottomTabBar from "./BottomTabBar";
import PlanFlipLayer from "./PlanFlipLayer";
import StudioSideRail from "./StudioSideRail";
import DemoClockRail from "./DemoClockRail";
import WorkReminderBar from "./WorkReminderBar";
import { PlanPreviewProvider } from "@/providers/plan-preview";
import { IconArrow } from "@/components/icons/IconArrow";

function showTabs(pathname: string) {
  return (
    pathname === "/home" ||
    pathname === "/explore" ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/consult") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/scene")
  );
}

function lockOnboardingScroll(pathname: string) {
  return pathname === "/" || pathname === "/purpose" || pathname.startsWith("/onboarding");
}

function showDemoClock(pathname: string) {
  return pathname === "/explore" || pathname.startsWith("/scene");
}

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const tabs = showTabs(pathname);
  const lockScroll = lockOnboardingScroll(pathname);
  const phoneScrollRef = useRef<HTMLDivElement>(null);
  const showSplashShortcut = pathname !== "/" && pathname !== "/purpose";
  const demoClock = showDemoClock(pathname);

  useEffect(() => {
    phoneScrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="relative flex min-h-dvh justify-center overflow-x-hidden overflow-y-auto bg-[#EEF0F4] sm:px-4 sm:py-6">
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-mint/80 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-butter/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-[#d7e4ff]/80 blur-3xl" />
      <div className="nf-grain" />

      <StudioSideRail showSplash={showSplashShortcut} />
      <DemoClockRail visible={demoClock} />

      <PlanPreviewProvider>
        <div className="relative my-auto flex items-start justify-center">
          <div
            data-phone-frame
            className="relative flex h-dvh w-full max-w-[402px] shrink-0 flex-col overflow-hidden bg-cream sm:h-[min(874px,calc(100dvh-3rem))] sm:w-[min(402px,calc((100dvh-3rem)*402/874))] sm:max-w-none sm:rounded-[48px] sm:shadow-[0_40px_90px_-28px_rgba(17,17,17,0.35)]"
          >
            <div className="pointer-events-none absolute top-[12px] left-1/2 z-50 hidden h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-ink sm:block" />
            <WorkReminderBar />
            <div
              ref={phoneScrollRef}
              data-phone-scroll
              className={`nf-scroll-hide @container flex min-h-0 flex-1 flex-col overscroll-contain pt-[max(12px,env(safe-area-inset-top,0px))] sm:pt-[44px] ${
                lockScroll ? "overflow-hidden" : "overflow-y-auto"
              } ${tabs ? "pb-[76px] sm:pb-[92px]" : "pb-[env(safe-area-inset-bottom,0px)]"}`}
            >
              <div
                key={pathname}
                className={`nf-page-enter ${lockScroll ? "flex min-h-0 flex-1 flex-col" : "min-h-full"}`}
              >
                {children}
              </div>
            </div>
            {tabs ? (
              <div className="absolute inset-x-0 bottom-0 z-40">
                <BottomTabBar />
              </div>
            ) : null}
            <PlanFlipLayer />
            <div className="pointer-events-none absolute bottom-[8px] left-1/2 z-50 hidden h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink/85 sm:block" />
          </div>
        </div>
      </PlanPreviewProvider>

      {showSplashShortcut && (
        <Link
          to="/"
          className="fixed top-4 left-4 z-[80] inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-ink shadow-[0_10px_28px_-12px_rgba(17,17,17,0.35)] ring-1 ring-ink/5 sm:hidden"
        >
          <IconArrow direction="left" className="h-3.5 w-3.5" />
          开屏
        </Link>
      )}
    </div>
  );
}
