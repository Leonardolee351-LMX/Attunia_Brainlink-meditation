/**
 * 状态评测:把 NeuroBand 的原始读数翻译成一个"被命名的当下"。
 *
 * 作用类似评测集给出的辅助判断——数值本身没有温度,
 * 命名之后 Tuno 才能说"我看到你现在是一根绷紧的弦",
 * 而不是"Arousal 82"。
 */
import type { UserState } from "@contracts/agents";

export interface StateAssessment {
  key: string;
  /** 状态的名字,如 "紧绷的弦" */
  name: string;
  /** 一句话白描(给 LLM 做语气素材,也可直接进回复) */
  depiction: string;
  /** 系统此刻最需要什么(引导方向) */
  need: string;
}

export function assessState(s: UserState): StateAssessment {
  // 睡眠严重不足,一票否决式优先
  if (s.sleepHours < 5.5) {
    return {
      key: "depleted",
      name: "透支的电池",
      depiction: `只睡了 ${s.sleepHours} 小时,身体还在用储备电硬撑`,
      need: "先补能,再谈效率——任何高强度练习都是在透支而不是训练",
    };
  }
  if (s.arousal >= 75 && s.calm < 50) {
    return {
      key: "wired",
      name: "绷紧的弦",
      depiction: `唤醒 ${s.arousal}、平静只有 ${s.calm},神经系统挂在高挡位下不来`,
      need: "先松刹车——让挂在高挡位的身体慢下来,别的都好说",
    };
  }
  if (s.arousal >= 75) {
    return {
      key: "revved",
      name: "空转的引擎",
      depiction: `唤醒 ${s.arousal},转速很高但不一定在往前走`,
      need: "把多余的转速卸掉,让动力和方向对齐",
    };
  }
  if (s.focus < 40 && s.arousal < 50) {
    return {
      key: "foggy",
      name: "起雾的玻璃",
      depiction: `专注 ${s.focus}、唤醒 ${s.arousal},人像隔了一层雾,提不起也静不下`,
      need: "轻轻擦亮——用低门槛的身体练习把注意力叫回来,而不是逼它回来",
    };
  }
  if (s.focus < 40) {
    return {
      key: "scattered",
      name: "撒落的珠子",
      depiction: `专注只有 ${s.focus},注意力是散的,东一颗西一颗`,
      need: "给一个可以收拢的支点——呼吸计数、一个声音、一个凝视点",
    };
  }
  if (s.arousal < 35 && s.calm >= 50) {
    return {
      key: "dimming",
      name: "将熄的灯",
      depiction: `唤醒 ${s.arousal}、平静 ${s.calm},能量已经很低,再松就要睡过去`,
      need: "如果目标是入睡,顺势而为;如果要工作,需要一点温和的唤醒",
    };
  }
  if (s.calm >= 70 && s.arousal < 55) {
    return {
      key: "still",
      name: "平静的水面",
      depiction: `平静 ${s.calm}、唤醒 ${s.arousal},少见的通透状态`,
      need: "适合做点真正重要的事,或者用一次轻练习把这个状态锚定下来",
    };
  }
  return {
    key: "neutral",
    name: "平常的天气",
    depiction: `唤醒 ${s.arousal}、专注 ${s.focus}、平静 ${s.calm},不好不坏的日常态`,
    need: "一次短练习就足以把天平推向你想去的方向",
  };
}
