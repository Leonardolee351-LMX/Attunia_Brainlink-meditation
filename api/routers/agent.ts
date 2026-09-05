import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { SingleAgent, DEFAULT_STATE } from "../agents/single-agent";
import { UserAgent } from "../agents/user-agent";
import { analyzeSession } from "../agents/debrief";
import { GOALS, PLANS, DEMO_PROFILE, getPlan } from "../agents/data/presets";
import { createExperts } from "../agents/experts/experts";
import { listTtsSpeakers, synthesizeSpeech } from "../agents/tts";

const stateSchema = z.object({
  arousal: z.number().min(0).max(100),
  focus: z.number().min(0).max(100),
  calm: z.number().min(0).max(100),
  sleepHours: z.number().min(0).max(24),
  availableMinutes: z.number().min(1).max(120),
});

/** 用户自带的 LLM 配置(只随请求使用,不在服务器持久化) */
const llmSchema = z
  .object({
    provider: z.enum(["rule", "kimi", "qwen", "minimax"]),
    apiKey: z.string().max(300).optional(),
    baseUrl: z.string().max(300).optional(),
    model: z.string().max(100).optional(),
  })
  .optional();

/** 用户记忆(前端 localStorage 里的训练/会诊历史,随请求带给 Tuno) */
const memorySchema = z
  .object({
    sessions: z
      .array(
        z.object({
          planId: z.string().max(60),
          planName: z.string().max(60),
          goalId: z.enum(["calm", "focus", "sleep"]).nullable(),
          durationMin: z.number().min(0).max(180),
          at: z.string().max(40),
          arousalStart: z.number().min(0).max(100),
          arousalEnd: z.number().min(0).max(100),
        }),
      )
      .max(30),
    consults: z
      .array(
        z.object({
          goalId: z.enum(["calm", "focus", "sleep"]),
          planId: z.string().max(60),
          planName: z.string().max(60),
          at: z.string().max(40),
        }),
      )
      .max(10),
  })
  .optional();

export const agentRouter = createRouter({
  /** 预设数据:3 个目标 + 5 类计划 + 演示档案 */
  presets: publicQuery.query(() => ({
    goals: GOALS,
    plans: PLANS,
    profile: DEMO_PROFILE,
    defaultState: DEFAULT_STATE,
    experts: createExperts().map((e) => ({ id: e.id, name: e.name, domain: e.domain })),
    ttsSpeakers: listTtsSpeakers(),
  })),

  /** 单 Agent:对话 → 意图 → 推荐 */
  chat: publicQuery
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .max(50),
        state: stateSchema.optional(),
        llm: llmSchema,
        memory: memorySchema,
      }),
    )
    .mutation(async ({ input }) => {
      const agent = new SingleAgent();
      return agent.chat(input.message, input.history, input.state, input.llm, input.memory);
    }),

  /** A2A:用户说一句话,Tuno 编排专家会诊并仲裁 */
  consult: publicQuery
    .input(
      z.object({
        message: z.string().min(1).max(2000),
        state: stateSchema,
        llm: llmSchema,
        memory: memorySchema,
      }),
    )
    .mutation(async ({ input }) => {
      const tuno = new UserAgent(DEMO_PROFILE);
      return tuno.consultMessage(input.message, input.state, input.llm, input.memory);
    }),

  /** TTS:MiniMax；speaker 区分训练引导与会诊专家。无 apiKey 才 unconfigured，空 GroupId 仍尝试合成 */
  tts: publicQuery
    .input(
      z.object({
        text: z.string().min(1).max(600),
        speaker: z.string().max(40).optional(),
      }),
    )
    .mutation(({ input }) => synthesizeSpeech(input)),

  /** 赛后解读:Tuno 分析训练中记录的生物数据流,给出友情提示 */
  debrief: publicQuery
    .input(
      z.object({
        planId: z.string(),
        goalId: z.enum(["calm", "focus", "sleep"]).nullable(),
        samples: z
          .array(
            z.object({
              t: z.number(),
              arousal: z.number(),
              focus: z.number(),
              calm: z.number(),
            }),
          )
          .max(4000),
      }),
    )
    .mutation(({ input }) => {
      const plan = getPlan(input.planId);
      if (!plan) throw new Error(`Unknown plan: ${input.planId}`);
      return analyzeSession(plan, input.goalId, input.samples);
    }),
});
