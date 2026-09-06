import { NavLink, useLocation } from "react-router";
import FluidPillTrack from "@/components/FluidPillTrack";

const TABS = [
  {
    to: "/home",
    label: "Home",
    Icon: HomeIcon,
    match: (p: string) => p === "/home" || p.startsWith("/chat"),
  },
  {
    to: "/explore",
    label: "Explore",
    Icon: ExploreIcon,
    match: (p: string) => p === "/explore" || p.startsWith("/scene"),
  },
  { to: "/consult", label: "Tuno", Icon: NovaIcon, match: (p: string) => p.startsWith("/consult") },
  { to: "/profile", label: "Profile", Icon: ProfileIcon, match: (p: string) => p.startsWith("/profile") },
] as const;

export default function BottomTabBar() {
  const { pathname } = useLocation();
  const activeIndex = Math.max(
    0,
    TABS.findIndex((tab) => tab.match(pathname)),
  );

  return (
    <nav
      className="border-t border-ink/[0.06] bg-cream/92 px-2 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom,0px))] backdrop-blur-xl sm:pb-[22px]"
      aria-label="主导航"
    >
      <FluidPillTrack
        activeIndex={activeIndex}
        count={TABS.length}
        className="grid grid-cols-4"
        pillClassName="bg-ink/[0.07]"
      >
        {TABS.map((tab, i) => {
          const on = tab.match(pathname);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              data-fluid-i={i}
              aria-current={on ? "page" : undefined}
              className={`relative z-[1] flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 transition-colors duration-300 active:scale-[0.97] ${
                on ? "text-ink" : "text-ink/35"
              }`}
            >
              <tab.Icon active={on} />
              <span className={`text-[10px] font-semibold tracking-wide ${on ? "text-ink" : "text-ink/40"}`}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </FluidPillTrack>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 11.2 12 4.8l7.5 6.4V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.2h-3.6V20.5H6A1.5 1.5 0 0 1 4.5 19v-7.8Z"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
      />
    </svg>
  );
}

/** Explore：探索训练计划 */
function ExploreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="8.2"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        fill={active ? "currentColor" : "none"}
      />
      <path
        d="M10.2 10.2 14.8 9.1 13.7 13.7 9.1 14.8 10.2 10.2Z"
        stroke={active ? "#F6F7F9" : "currentColor"}
        strokeWidth={active ? 1.6 : 1.4}
        strokeLinejoin="round"
        fill={active ? "#F6F7F9" : "none"}
      />
    </svg>
  );
}

function NovaIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="8.2"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        fill={active ? "currentColor" : "none"}
      />
      <path
        d="M9.2 16.2V8.2h1.7l4 5.4V8.2h1.9v8h-1.7l-4-5.4v5.4H9.2Z"
        fill={active ? "#F6F7F9" : "currentColor"}
      />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="8.2"
        r="3.2"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        fill={active ? "currentColor" : "none"}
      />
      <path
        d="M5.2 18.8c1.4-3.1 3.9-4.6 6.8-4.6s5.4 1.5 6.8 4.6"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
