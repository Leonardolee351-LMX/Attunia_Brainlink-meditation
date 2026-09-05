import { describe, expect, it } from "vitest";
import { listTtsSpeakers, resolveTtsVoice } from "./tts";

describe("B-6 expert TTS voices", () => {
  it("maps each consult speaker to a distinct MiniMax voice_id", () => {
    const speakers = listTtsSpeakers().filter((id) => id !== "guidance" && id !== "nova");
    const ids = speakers.map((s) => resolveTtsVoice(s).voiceId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(resolveTtsVoice("tuno").voiceId).toBe("presenter_female");
    expect(resolveTtsVoice("expert_counsel").voiceId).toBe("female-tianmei");
    expect(resolveTtsVoice("expert_neuro").voiceId).toBe("audiobook_male_1");
    expect(resolveTtsVoice("expert_art").voiceId).toBe("female-shaonv");
  });

  it("unknown speaker falls back to guidance, not another expert", () => {
    const unknown = resolveTtsVoice("expert_nobody");
    expect(unknown.speaker).toBe("guidance");
    expect(unknown.voiceId).toBe(resolveTtsVoice("guidance").voiceId);
  });
});
