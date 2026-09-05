import { useEffect, useRef } from "react";
import { sceneBgmSrc } from "@/lib/scene-audio";
import { subscribeGuidanceDuck } from "@/lib/tts";
import type { WorkSceneId } from "@/lib/scenes";

/** 场景声景：循环、可随引导语闪避。 */
export function useSceneBgm(sceneId: WorkSceneId, playing: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = new Audio(sceneBgmSrc(sceneId));
    el.loop = true;
    el.volume = 0.34;
    el.preload = "auto";
    audioRef.current = el;
    const unduck = subscribeGuidanceDuck((on) => {
      if (!audioRef.current) return;
      audioRef.current.volume = on ? 0.14 : 0.34;
    });
    return () => {
      unduck();
      el.pause();
      el.src = "";
      audioRef.current = null;
    };
  }, [sceneId]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      void el.play().catch(() => {
        /* 浏览器可能拦自动播放，点开始后再试 */
      });
    } else {
      el.pause();
    }
  }, [playing, sceneId]);

  const seek = (deltaSec: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    el.currentTime = Math.max(0, Math.min(el.duration - 0.2, el.currentTime + deltaSec));
  };

  return { seek };
}
