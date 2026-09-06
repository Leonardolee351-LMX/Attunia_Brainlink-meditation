/**
 * 手机框内顶部信息条：渐入、5 秒自动关、可关、可跳训练。
 */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  publishWorkReminder,
  subscribeWorkReminder,
  type WorkReminderPayload,
} from "@/lib/work-reminder-bus";

const AUTO_MS = 5000;

export default function WorkReminderBar() {
  const [payload, setPayload] = useState<WorkReminderPayload | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return subscribeWorkReminder((next) => {
      if (!next) {
        setVisible(false);
        window.setTimeout(() => setPayload(null), 280);
        return;
      }
      setPayload(next);
      // 下一帧再 visible，触发 transition
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  useEffect(() => {
    if (!payload || !visible) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => {
        setPayload(null);
        publishWorkReminder(null);
      }, 280);
    }, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [payload, visible]);

  if (!payload) return null;

  const canTrain =
    (payload.need === "rest" || payload.need === "focus") &&
    Boolean(payload.planId || payload.sceneId);
  const href = payload.planId
    ? `/session/${payload.planId}`
    : payload.sceneId
      ? `/scene/${payload.sceneId}`
      : null;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-[max(44px,env(safe-area-inset-top,0px))] z-[55] flex justify-center px-3 sm:top-[48px] ${
        visible ? "opacity-100" : "opacity-0"
      } transition-opacity duration-300 ease-out`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex max-w-[min(100%,360px)] items-start gap-2 rounded-2xl bg-ink/95 px-3 py-2.5 text-white shadow-[0_16px_40px_-16px_rgba(17,17,17,0.55)] ring-1 ring-white/10 transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "-translate-y-3"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[12px] leading-snug font-semibold tracking-wide">{payload.line}</p>
          {href && canTrain ? (
            <Link
              to={href}
              state={{ fromDetect: true, goalId: payload.need === "focus" ? "focus" : "calm" }}
              className="mt-1 inline-block text-[11px] font-semibold text-[#B8F2C9] underline-offset-2 hover:underline"
              onClick={() => publishWorkReminder(null)}
            >
              开始训练 →
            </Link>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="关闭提醒"
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] text-white/80 hover:bg-white/20"
          onClick={() => publishWorkReminder(null)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
