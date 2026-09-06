import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { SingleAgent, DEFAULT_STATE } from "../agents/single-agent";
import { UserAgent } from "../agents/user-agent";
import { analyzeSession } from "../agents/debrief";
import { GOALS, PLANS, DEMO_PROFILE, getPlan } from "../agents/data/presets";
import { createExperts } from "../agents/experts/experts";
import { listTtsSpeakers, synthesizeSpeech } from "../agents/tts";
import { detectWorkNeed } from "../agents/work-detect";
import { listWorkReminders, recordWorkReminder } from "../agents/work-reminder-log";
import {
  appendChatDigest,
  compressChatTurn,
  mergeAndPersistMemory,
  readDiskMemory,
} from "../agents/user-memory-store";
import type { UserMemory } from "@contracts/agents";

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
    provider: z.enum(["rule", "qiji", "kimi", "qwen", "minimax"]),
    apiKey: z.string().max(300).optional(),
    baseUrl: z.string().max(300).optional(),
    model: z.string().max(100).optional(),
  })
  .optional();

/** 用户记忆(浏览器热缓存 + 服务端 data/user-memory 落盘) */
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
      .max(80),
    consults: z
      .array(
        z.object({
          goalId: z.enum(["calm", "focus", "sleep"]),
          planId: z.string().max(60),
          planName: z.string().max(60),
          at: z.string().max(40),
        }),
      )
      .max(30),
    habits: z
      .object({
        updatedAt: z.string().max(40),
        favoriteGoal: z.enum(["calm", "focus", "sleep"]).nullable(),
        preferredPlanIds: z.array(z.string().max(60)).max(8),
        preferredDurationMin: z.number().min(0).max(180).nullable(),
        peakHours: z.array(z.number().min(0).max(23)).max(5),
        notes: z.array(z.string().max(200)).max(8),
      })
      .optional(),
    chatDigests: z
      .array(
        z.object({
          at: z.string().max(40),
          summary: z.string().max(200),
          goalId: z.enum(["calm", "focus", "sleep"]).nullable(),
          planId: z.string().max(60).nullable(),
        }),
      )
      .max(40)
      .optional(),
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
      const memory = mergeAndPersistMemory(input.memory as UserMemory | undefined);
      const agent = new SingleAgent();
      const result = await agent.chat(input.message, input.history, input.state, input.llm, memory);
      const top = result.recommendations[0];
      const comboStep = result.combo?.steps[0];
      const digestMemory = appendChatDigest(
        compressChatTurn({
          userMessage: input.message,
          goalId: result.intent.goalId,
          planId: top?.plan.id ?? comboStep?.planId ?? null,
          planName: top?.plan.name ?? comboStep?.name ?? null,
        }),
        memory,
      );
      return { ...result, memory: digestMemory };
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
      const memory = mergeAndPersistMemory(input.memory as UserMemory | undefined);
      const tuno = new UserAgent(DEMO_PROFILE);
      const result = await tuno.consultMessage(input.message, input.state, input.llm, memory);
      const digestMemory = appendChatDigest(
        compressChatTurn({
          userMessage: input.message,
          goalId: result.goalId,
          planId: result.decision.planId,
          planName: result.decision.planName,
        }),
        memory,
      );
      return { ...result, memory: digestMemory };
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

  /** 赛后解读:Tuno 分析训练中记录的生物数据流；有 LLM 时个人化深挖 */
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
        llm: llmSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const plan = getPlan(input.planId);
      if (!plan) throw new Error(`Unknown plan: ${input.planId}`);
      return analyzeSession(plan, input.goalId, input.samples, input.llm);
    }),

  /**
   * 工作态 10 分钟窗检测：超载→冥想减压，走神→专注回笼。
   * 前端缓冲近窗三通道点后调用；不按秒级尖峰弹窗。
   */
  detectWorkNeed: publicQuery
    .input(
      z.object({
        samples: z
          .array(
            z.object({
              t: z.number(),
              arousal: z.number().min(0).max(100),
              focus: z.number().min(0).max(100),
              calm: z.number().min(0).max(100),
              signal: z.number().optional(),
            }),
          )
          .max(4000),
        sinceLastNotifySec: z.number().min(0).max(86400).optional(),
        atWork: z.boolean().optional(),
      }),
    )
    .mutation(({ input }) =>
      detectWorkNeed(input.samples, {
        sinceLastNotifySec: input.sinceLastNotifySec,
        atWork: input.atWork,
      }),
    ),

  /** 记录一次工作态异常提醒（时间戳 + 类型），落盘 data/work-reminders.jsonl */
  recordWorkReminder: publicQuery
    .input(
      z.object({
        need: z.enum(["none", "rest", "focus", "insufficient"]),
        label: z.string().max(80),
        line: z.string().max(200),
        sceneId: z.string().max(40).nullable(),
        planId: z.string().max(60).nullable(),
        source: z.enum(["demo", "live", "studio"]).default("studio"),
      }),
    )
    .mutation(({ input }) => recordWorkReminder(input)),

  listWorkReminders: publicQuery
    .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
    .query(({ input }) => listWorkReminders(input?.limit ?? 50)),

  /** 训练结束后同步浏览器记忆 → data/user-memory/，返回含习惯画像的合并结果 */
  syncMemory: publicQuery
    .input(z.object({ memory: memorySchema }))
    .mutation(({ input }) => mergeAndPersistMemory(input.memory as UserMemory | undefined)),

  /** 读取服务端落盘记忆（含 habits / chatDigests） */
  getMemory: publicQuery.query(() => readDiskMemory()),
});
