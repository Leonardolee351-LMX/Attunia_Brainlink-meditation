/**
 * 语音：训练引导 + 单 Agent（Tuno）优先 MiniMax；会诊仅点播。
 *
 * 1. POST /api/trpc/agent.tts（可带 speaker）
 * 2. 有 base64 audio 就播 MiniMax
 * 3. guidance / tuno：禁止降级浏览器机器音（失败则静音）
 * 4. 会诊专家：可选本机兜底（产品优先级更低）
 */

/** 临时关闭：单 Agent / Multi-Agent 对话语音；训练页 speaker=guidance 仍可用 */
export const AGENT_CHAT_VOICE_ENABLED = false;

let currentAudio: HTMLAudioElement | null = null;
let speakGen = 0;
const duckers = new Set<(on: boolean) => void>();

/** 训练引导、单 Agent：绝不走 SpeechSynthesis */
const NO_BROWSER_SPEAKERS = new Set(["guidance", "tuno", "nova"]);

function isAgentChatSpeaker(speaker: string): boolean {
  return speaker !== "guidance";
}

export function subscribeGuidanceDuck(cb: (on: boolean) => void): () => void {
  duckers.add(cb);
  return () => duckers.delete(cb);
}

function setDucking(on: boolean) {
  duckers.forEach((cb) => cb(on));
}

export function stopGuidance() {
  speakGen += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  try {
    speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  setDucking(false);
}

type BrowserTimbre = { rate: number; pitch: number; prefer: RegExp };

const BROWSER_TIMBRE: Record<string, BrowserTimbre> = {
  guidance: { rate: 0.72, pitch: 1.12, prefer: /xiaoxiao|晓晓|female|女/ },
  tuno: { rate: 0.9, pitch: 1.02, prefer: /xiaoyi|晓伊|yunxi|云希/ },
  nova: { rate: 0.9, pitch: 1.02, prefer: /xiaoyi|晓伊|yunxi|云希/ },
  expert_counsel: { rate: 0.78, pitch: 1.22, prefer: /tianmei|甜美|huihui|晓慧/ },
  expert_neuro: { rate: 0.84, pitch: 0.78, prefer: /yunyang|云扬|kangkang|男/ },
  expert_cogsci: { rate: 0.86, pitch: 1.06, prefer: /xiaoyan|晓燕|yujie/ },
  expert_flow: { rate: 0.94, pitch: 0.88, prefer: /yunxi|云希|male|男/ },
  expert_art: { rate: 0.9, pitch: 1.3, prefer: /xiaoxiao|晓晓|shaonv|少女/ },
};

function pickZhVoice(speaker: string): SpeechSynthesisVoice | null {
  let voices: SpeechSynthesisVoice[] = [];
  try {
    voices = speechSynthesis.getVoices();
  } catch {
    return null;
  }
  const zh = voices.filter((v) => v.lang.toLowerCase().startsWith("zh"));
  if (!zh.length) return null;
  const timbre = BROWSER_TIMBRE[speaker];
  if (timbre) {
    const hit = zh.find((v) => timbre.prefer.test(v.name.toLowerCase()));
    if (hit) return hit;
  }
  const idx = Math.abs(hashSpeaker(speaker)) % zh.length;
  return zh[idx] ?? zh[0];
}

function hashSpeaker(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

async function speakByBrowser(text: string, speaker: string) {
  const timbre = BROWSER_TIMBRE[speaker] ?? BROWSER_TIMBRE.guidance;
  try {
    await new Promise<void>((resolve) => {
      const ready = speechSynthesis.getVoices();
      if (ready.length) {
        resolve();
        return;
      }
      const done = () => resolve();
      speechSynthesis.addEventListener("voiceschanged", done, { once: true });
      window.setTimeout(done, 500);
    });
    const parts = text
      .split(/(?<=[。！？；\n])/)
      .map((s) => s.trim())
      .filter(Boolean);
    const queue = parts.length ? parts : [text];
    const voice = pickZhVoice(speaker);
    setDucking(true);
    const speakNext = (i: number) => {
      if (i >= queue.length) {
        setDucking(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(queue[i]);
      u.lang = "zh-CN";
      u.rate = timbre.rate;
      u.pitch = timbre.pitch;
      u.volume = 0.88;
      if (voice) u.voice = voice;
      u.onend = () => {
        window.setTimeout(() => speakNext(i + 1), 220);
      };
      u.onerror = () => setDucking(false);
      speechSynthesis.speak(u);
    };
    speakNext(0);
  } catch {
    setDucking(false);
  }
}

export function clipSpeakText(text: string, max = 220): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).replace(/[，。；、\s]+$/, "")}。`;
}

/** @returns played=播完；silent=无音频；cancelled=被新一轮 speak / stop 打断 */
export async function speakGuidance(
  text: string,
  speaker = "guidance",
): Promise<"played" | "silent" | "cancelled"> {
  if (!AGENT_CHAT_VOICE_ENABLED && isAgentChatSpeaker(speaker)) {
    return "silent";
  }
  const gen = ++speakGen;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  try {
    speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  setDucking(false);

  const clipped = clipSpeakText(text, 600);
  try {
    const res = await fetch("/api/trpc/agent.tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: { text: clipped, speaker } }),
    });
    const json = (await res.json()) as {
      result?: { data?: { json?: { audio: string | null; engine: string } } };
    };
    if (gen !== speakGen) return "cancelled";
    const audio = json.result?.data?.json?.audio;
    if (typeof audio === "string" && audio.length > 0) {
      const el = new Audio(`data:audio/mp3;base64,${audio}`);
      el.volume = 0.9;
      currentAudio = el;
      setDucking(true);
      const outcome = await new Promise<"played" | "silent" | "cancelled">((resolve) => {
        el.onended = () => {
          setDucking(false);
          resolve(gen === speakGen ? "played" : "cancelled");
        };
        el.onerror = () => {
          setDucking(false);
          resolve(gen === speakGen ? "silent" : "cancelled");
        };
        void el.play().catch(() => {
          setDucking(false);
          resolve(gen === speakGen ? "silent" : "cancelled");
        });
      });
      return outcome;
    }
  } catch {
    /* MiniMax 失败 */
  }
  if (gen !== speakGen) return "cancelled";
  // 训练引导 / 单 Agent：禁止机器音，失败则静音
  if (NO_BROWSER_SPEAKERS.has(speaker)) return "silent";
  await speakByBrowser(clipped, speaker);
  return gen === speakGen ? "played" : "cancelled";
}
