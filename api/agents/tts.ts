/**
 * MiniMax TTS：训练引导 + 会诊按说话人切音色。
 * GroupId 可选；有 apiKey 即可打 t2a_v2（空 GroupId 不再整条降级）。
 */
import { builtinMinimax, minimaxTtsVoice } from "./llm/provider";

export type TtsVoicePick = {
  speaker: string;
  voiceId: string;
  speed: number;
  pitch: number;
};

/** 训练引导默认女声；会诊 Tuno / 五位专家各用一条系统音色 */
const SPEAKER_VOICES: Record<string, { voiceId: string; speed: number; pitch: number }> = {
  guidance: { voiceId: "audiobook_female_1", speed: 0.75, pitch: 0 },
  tuno: { voiceId: "presenter_female", speed: 0.88, pitch: 0 },
  // 兼容旧 speaker id
  nova: { voiceId: "presenter_female", speed: 0.88, pitch: 0 },
  expert_counsel: { voiceId: "female-tianmei", speed: 0.82, pitch: 0 },
  expert_neuro: { voiceId: "audiobook_male_1", speed: 0.84, pitch: 0 },
  expert_cogsci: { voiceId: "female-yujie", speed: 0.86, pitch: 0 },
  expert_flow: { voiceId: "male-qn-qingse", speed: 0.9, pitch: 0 },
  expert_art: { voiceId: "female-shaonv", speed: 0.88, pitch: 1 },
};

export function listTtsSpeakers(): string[] {
  return Object.keys(SPEAKER_VOICES);
}

export function resolveTtsVoice(speaker?: string | null): TtsVoicePick {
  const fallback = minimaxTtsVoice();
  const key = (speaker ?? "guidance").trim() || "guidance";
  const mapped = SPEAKER_VOICES[key];
  if (!mapped) {
    return {
      speaker: "guidance",
      voiceId: fallback.voiceId,
      speed: fallback.speed,
      pitch: fallback.pitch,
    };
  }
  if (key === "guidance") {
    return {
      speaker: key,
      voiceId: fallback.voiceId || mapped.voiceId,
      speed: fallback.speed,
      pitch: fallback.pitch,
    };
  }
  return { speaker: key, ...mapped };
}

function t2aUrl(groupId?: string): string {
  const base = "https://api.minimaxi.com/v1/t2a_v2";
  return groupId ? `${base}?GroupId=${encodeURIComponent(groupId)}` : base;
}

export async function synthesizeSpeech(input: {
  text: string;
  speaker?: string;
}): Promise<{
  audio: string | null;
  engine: string;
  voiceId?: string;
  speaker: string;
}> {
  const pick = resolveTtsVoice(input.speaker);
  const { apiKey, groupId } = builtinMinimax();
  const voice = minimaxTtsVoice();
  if (!apiKey) {
    return { audio: null, engine: "unconfigured", speaker: pick.speaker, voiceId: pick.voiceId };
  }
  try {
    const res = await fetch(t2aUrl(groupId), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: voice.model,
        text: input.text,
        stream: false,
        voice_setting: {
          voice_id: pick.voiceId,
          speed: pick.speed,
          vol: voice.vol,
          pitch: pick.pitch,
          emotion: "neutral",
        },
        audio_setting: { format: "mp3", sample_rate: 32000, channel: 1 },
      }),
    });
    if (!res.ok) {
      return { audio: null, engine: `http-${res.status}`, speaker: pick.speaker, voiceId: pick.voiceId };
    }
    const data = (await res.json()) as {
      data?: { audio?: string };
      base_resp?: { status_code?: number };
    };
    const hex = data.data?.audio;
    if (!hex || (data.base_resp?.status_code ?? 0) !== 0) {
      return { audio: null, engine: "minimax-error", speaker: pick.speaker, voiceId: pick.voiceId };
    }
    const b64 = Buffer.from(hex, "hex").toString("base64");
    return { audio: b64, engine: "minimax", voiceId: pick.voiceId, speaker: pick.speaker };
  } catch {
    return { audio: null, engine: "unreachable", speaker: pick.speaker, voiceId: pick.voiceId };
  }
}
