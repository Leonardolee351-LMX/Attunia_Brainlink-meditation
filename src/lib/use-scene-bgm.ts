import { useEffect, useRef } from "react";
import { sceneBgmSrc } from "@/lib/scene-audio";
import { subscribeGuidanceDuck } from "@/lib/tts";
import type { WorkSceneId } from "@/lib/scenes";

const BASE_VOL = 0.34;
const DUCK_VOL = 0.14;
const FADE_MS = 900;

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** 场景声景：循环、场景切换交叉淡入淡出、可随引导语闪避。 */
export function useSceneBgm(sceneId: WorkSceneId, playing: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const duckRef = useRef(false);
  const playingRef = useRef(playing);
  /** 递增后，所有进行中的 fade 停止 */
  const epochRef = useRef(0);
  /** 每个 audio 各自的 raf，支持交叉淡入淡出并行 */
  const rafByEl = useRef(new WeakMap<HTMLAudioElement, number>());

  playingRef.current = playing;

  const settleVol = () => (duckRef.current ? DUCK_VOL : BASE_VOL);

  const cancelElFade = (el: HTMLAudioElement) => {
    const id = rafByEl.current.get(el);
    if (id) {
      cancelAnimationFrame(id);
      rafByEl.current.delete(el);
    }
  };

  const bumpEpoch = () => {
    epochRef.current += 1;
  };

  const fadeTo = (
    el: HTMLAudioElement,
    to: number,
    ms: number,
    onDone?: () => void,
  ) => {
    cancelElFade(el);
    const epoch = epochRef.current;
    const from = el.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      if (epoch !== epochRef.current) {
        rafByEl.current.delete(el);
        return;
      }
      const p = smoothstep((now - t0) / ms);
      try {
        el.volume = from + (to - from) * p;
      } catch {
        rafByEl.current.delete(el);
        return;
      }
      if (p < 1) {
        rafByEl.current.set(el, requestAnimationFrame(step));
      } else {
        rafByEl.current.delete(el);
        try {
          el.volume = to;
        } catch {
          /* disposed */
        }
        onDone?.();
      }
    };
    rafByEl.current.set(el, requestAnimationFrame(step));
  };

  const dispose = (el: HTMLAudioElement | null) => {
    if (!el) return;
    cancelElFade(el);
    el.pause();
    el.removeAttribute("src");
    el.load();
  };

  // 场景切换：旧轨淡出 + 新轨淡入（可并行）
  useEffect(() => {
    const prev = audioRef.current;
    const el = new Audio(sceneBgmSrc(sceneId));
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    audioRef.current = el;

    if (prev) {
      fadeTo(prev, 0, FADE_MS, () => dispose(prev));
    }

    if (playingRef.current) {
      void el.play().catch(() => {});
      fadeTo(el, settleVol(), FADE_MS);
    }

    return () => {
      // 换场景时不 bumpEpoch，让 prev 的淡出继续；组件卸载由下面 effect 清理
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId]);

  // 播放 / 暂停带淡入淡出
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      void el.play().catch(() => {});
      fadeTo(el, settleVol(), FADE_MS);
    } else {
      fadeTo(el, 0, FADE_MS * 0.75, () => {
        el.pause();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    const unduck = subscribeGuidanceDuck((on) => {
      duckRef.current = on;
      const el = audioRef.current;
      if (!el || !playingRef.current) return;
      if (rafByEl.current.has(el)) return;
      el.volume = on ? DUCK_VOL : BASE_VOL;
    });
    return () => {
      unduck();
      bumpEpoch();
      dispose(audioRef.current);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seek = (deltaSec: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = Math.max(0, Math.min(el.duration - 0.2, el.currentTime + deltaSec));
  };

  return { seek };
}
