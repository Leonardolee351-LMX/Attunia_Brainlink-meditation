/** 工作室侧栏 → 手机框内信息条 */
export type WorkReminderPayload = {
  need: "none" | "rest" | "focus" | "insufficient";
  label: string;
  /** 一行精简文案 */
  line: string;
  planId: string | null;
  sceneId: string | null;
  sceneName: string | null;
};

type Listener = (payload: WorkReminderPayload | null) => void;

const listeners = new Set<Listener>();

export function publishWorkReminder(payload: WorkReminderPayload | null) {
  listeners.forEach((cb) => cb(payload));
}

export function subscribeWorkReminder(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function shortReminderLine(input: {
  need: string;
  label: string;
  sceneName: string | null;
}): string {
  if (input.need === "none" || input.need === "insufficient") {
    return input.need === "insufficient" ? "样本不足，暂无法判定" : "状态平稳，暂不提醒";
  }
  const scene = input.sceneName ? `「${input.sceneName}」` : "对应训练";
  return `近10分钟${input.label} · 去${scene}`;
}
