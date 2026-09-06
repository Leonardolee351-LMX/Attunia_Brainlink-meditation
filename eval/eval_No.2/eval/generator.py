#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NeuroFlow / ONDANEURO 合成数据生成器
基于真实 EEG 波形统计特征，以标签反推读数 + 噪声

用法:
    python generator.py --count 240 --output eval/states.jsonl
    python generator.py --timeseries --count 20 --output eval/timeseries/
"""

import argparse
import json
import random
import numpy as np
from pathlib import Path

# ========== 与生产代码一致的规则阈值阶梯 ==========
def assessState(arousal: int, focus: int, calm: int, sleepHours: float) -> str:
    if sleepHours < 5.5:
        return "depleted"
    if arousal >= 75 and calm < 50:
        return "wired"
    if arousal >= 75:
        return "revved"
    if focus < 40 and arousal < 50:
        return "foggy"
    if focus < 40:
        return "scattered"
    if arousal < 35 and calm >= 50:
        return "dimming"
    if calm >= 70 and arousal < 55:
        return "still"
    return "neutral"

# ========== 状态元数据 ==========
STATE_META = {
    "depleted": {
        "name": "透支的电池",
        "dominantGoal": "sleep",
        "weightsOrder": ["sleep", "calm", "focus"],
        "scenario_pool": ["熬夜赶工后", "凌晨三点才睡", "通宵后硬撑上班", "带娃夜醒多次", "跨时区出差"],
        "utterance_pool": [
            "昨晚只睡了四个小时，现在头重脚轻",
            "熬了一宿，感觉魂在后面追",
            "眼睛睁着，脑子已经关机了",
            "困到想趴在键盘上睡着",
            "咖啡都救不了我了"
        ]
    },
    "wired": {
        "name": "绷紧的弦",
        "dominantGoal": "calm",
        "weightsOrder": ["calm", "focus", "sleep"],
        "scenario_pool": ["重要汇报前", "面试前", "考试前夜", "收到坏消息后", "deadline逼近"],
        "utterance_pool": [
            "等会要汇报，心跳好快，静不下来",
            "脑子里像有台马达在转，停不下来",
            "焦虑到胃都在抽筋",
            "明明很累，却放松不下来",
            "感觉全身都在发抖"
        ]
    },
    "revved": {
        "name": "空转的引擎",
        "dominantGoal": "focus",
        "weightsOrder": ["focus", "calm", "sleep"],
        "scenario_pool": ["咖啡因过量", "收到好消息后兴奋", "健身后肾上腺素飙升", "游戏连胜后", "聚会散场后"],
        "utterance_pool": [
            "兴奋得坐不住，但不知道干嘛",
            "浑身是劲，脑子却东想西想",
            "像刚喝完三杯浓缩，停不下来",
            "能量爆棚，但注意力散成烟花",
            "心跳很快，但挺舒服的"
        ]
    },
    "foggy": {
        "name": "起雾的玻璃",
        "dominantGoal": "focus",
        "weightsOrder": ["focus", "calm", "sleep"],
        "scenario_pool": ["午后犯困", "饭后血糖飙升", "阴天久坐", "感冒初愈", "周末作息混乱后"],
        "utterance_pool": [
            "脑子像浆糊，转不动",
            "看着屏幕，字在飘",
            "昏昏沉沉的，想趴下",
            "反应慢半拍，像没睡醒",
            "注意力涣散，但不是因为焦虑"
        ]
    },
    "scattered": {
        "name": "撒落的珠子",
        "dominantGoal": "focus",
        "weightsOrder": ["focus", "calm", "sleep"],
        "scenario_pool": ["多任务并行后", "社交媒体刷太久", "刚开完长会", "被频繁打断后", "假期后复工"],
        "utterance_pool": [
            "东想西想，停不下来",
            "刚想干这个，又跳到那个",
            "注意力像蝴蝶，到处飞",
            "想专注，但脑子自己跑",
            "刷了一小时手机，更累了"
        ]
    },
    "dimming": {
        "name": "将熄的灯",
        "dominantGoal": "calm",
        "weightsOrder": ["calm", "sleep", "focus"],
        "scenario_pool": ["傍晚低能量期", "长途通勤后", "社交消耗后", "长时间会议后", "阴天傍晚"],
        "utterance_pool": [
            "没什么劲，但也不焦虑",
            "像电池黄了，想缓缓",
            "不想动，但也没困到要睡",
            "整个人淡淡的，没波澜",
            "能量很低，但心里还算平静"
        ]
    },
    "still": {
        "name": "平静的水面",
        "dominantGoal": "calm",
        "weightsOrder": ["calm", "focus", "sleep"],
        "scenario_pool": ["晨间例行冥想后", "瑜伽课后", "公园散步后", "刚结束一段休息", "日常平静时刻"],
        "utterance_pool": [
            "现在挺平静的，想保持住",
            "感觉还不错，想再稳一稳",
            "没什么特别的，就挺舒服",
            "想做个轻量的练习维持状态",
            "今天状态还行，预防性维护一下"
        ]
    },
    "neutral": {
        "name": "平常的天气",
        "dominantGoal": "calm",
        "weightsOrder": ["calm", "focus", "sleep"],
        "scenario_pool": ["普通工作日", "午休间隙", "通勤路上", "日常碎片时间", "无明显情绪波动时"],
        "utterance_pool": [
            "就平常一天，想放松一下",
            "没什么特别的，随便练练",
            "有点时间，做个练习",
            "状态一般，不糟也不好",
            "想试试不同的练习"
        ]
    }
}

# ========== 基于真实波形统计的10秒序列生成参数 ==========
STATE_WAVEFORM_PROFILES = {
    "depleted": {
        "trend_pattern": "drifting",
        "attention_range": (5, 35), "meditation_range": (30, 60),
        "alpha_rel_range": (0.05, 0.12), "beta_theta_range": (0.2, 0.6),
        "delta_ratio_range": (0.5, 0.7), "attention_cv_range": (0.4, 0.8),
        "total_power_range": (300000, 900000)
    },
    "wired": {
        "trend_pattern": "oscillating",
        "attention_range": (50, 90), "meditation_range": (15, 45),
        "alpha_rel_range": (0.04, 0.10), "beta_theta_range": (1.0, 3.0),
        "delta_ratio_range": (0.3, 0.5), "attention_cv_range": (0.15, 0.4),
        "total_power_range": (150000, 600000)
    },
    "revved": {
        "trend_pattern": "rising_then_falling",
        "attention_range": (55, 95), "meditation_range": (50, 80),
        "alpha_rel_range": (0.05, 0.12), "beta_theta_range": (0.8, 2.5),
        "delta_ratio_range": (0.3, 0.5), "attention_cv_range": (0.1, 0.35),
        "total_power_range": (150000, 550000)
    },
    "foggy": {
        "trend_pattern": "flat_low",
        "attention_range": (5, 35), "meditation_range": (40, 70),
        "alpha_rel_range": (0.08, 0.15), "beta_theta_range": (0.2, 0.6),
        "delta_ratio_range": (0.5, 0.7), "attention_cv_range": (0.3, 0.6),
        "total_power_range": (350000, 950000)
    },
    "scattered": {
        "trend_pattern": "erratic",
        "attention_range": (10, 35), "meditation_range": (40, 75),
        "alpha_rel_range": (0.06, 0.14), "beta_theta_range": (0.2, 0.8),
        "delta_ratio_range": (0.4, 0.6), "attention_cv_range": (0.4, 0.9),
        "total_power_range": (300000, 900000)
    },
    "dimming": {
        "trend_pattern": "gradually_declining",
        "attention_range": (20, 50), "meditation_range": (55, 80),
        "alpha_rel_range": (0.12, 0.22), "beta_theta_range": (0.3, 1.0),
        "delta_ratio_range": (0.25, 0.45), "attention_cv_range": (0.15, 0.4),
        "total_power_range": (50000, 250000)
    },
    "still": {
        "trend_pattern": "stable_high",
        "attention_range": (30, 60), "meditation_range": (70, 95),
        "alpha_rel_range": (0.14, 0.24), "beta_theta_range": (0.3, 1.2),
        "delta_ratio_range": (0.2, 0.4), "attention_cv_range": (0.1, 0.3),
        "total_power_range": (30000, 150000)
    },
    "neutral": {
        "trend_pattern": "wandering",
        "attention_range": (35, 65), "meditation_range": (45, 70),
        "alpha_rel_range": (0.08, 0.16), "beta_theta_range": (0.3, 1.0),
        "delta_ratio_range": (0.35, 0.55), "attention_cv_range": (0.2, 0.5),
        "total_power_range": (200000, 700000)
    }
}

# ========== 与规则一致的UserState阈值范围 ==========
STATE_RANGES = {
    "depleted": {"arousal": (20, 70), "focus": (15, 85), "calm": (20, 85), "sleepHours": (2.0, 5.4), "availableMinutes": (5, 30)},
    "wired": {"arousal": (75, 98), "focus": (20, 90), "calm": (15, 49), "sleepHours": (5.5, 9.0), "availableMinutes": (5, 20)},
    "revved": {"arousal": (75, 98), "focus": (20, 90), "calm": (50, 85), "sleepHours": (5.5, 9.0), "availableMinutes": (5, 25)},
    "foggy": {"arousal": (10, 49), "focus": (5, 39), "calm": (20, 85), "sleepHours": (5.5, 9.0), "availableMinutes": (10, 30)},
    "scattered": {"arousal": (50, 74), "focus": (5, 39), "calm": (20, 85), "sleepHours": (5.5, 9.0), "availableMinutes": (10, 25)},
    "dimming": {"arousal": (5, 34), "focus": (20, 85), "calm": (50, 85), "sleepHours": (5.5, 9.0), "availableMinutes": (10, 40)},
    "still": {"arousal": (5, 54), "focus": (40, 90), "calm": (70, 95), "sleepHours": (5.5, 9.0), "availableMinutes": (10, 60)},
    "neutral": {"arousal": (35, 74), "focus": (40, 90), "calm": (20, 69), "sleepHours": (5.5, 9.0), "availableMinutes": (5, 60)},
}


def generate_10sec_sequence(state_label: str, base_arousal: int, base_focus: int, base_calm: int):
    """生成10秒BioSample序列，波形特征与真实数据一致"""
    prof = STATE_WAVEFORM_PROFILES[state_label]
    pattern = prof["trend_pattern"]

    if pattern == "drifting":
        trend_a = np.linspace(0, -8, 10) + np.random.normal(0, 2, 10)
        trend_c = np.random.normal(0, 1.5, 10)
        trend_f = np.linspace(0, -5, 10) + np.random.normal(0, 2, 10)
    elif pattern == "oscillating":
        trend_a = np.sin(np.linspace(0, 3*np.pi, 10)) * 8 + np.random.normal(0, 2, 10)
        trend_c = np.random.normal(0, 3, 10)
        trend_f = np.sin(np.linspace(0, 2*np.pi, 10)) * 5 + np.random.normal(0, 2, 10)
    elif pattern == "rising_then_falling":
        trend_a = np.concatenate([np.linspace(0, 6, 5), np.linspace(6, -2, 5)]) + np.random.normal(0, 2, 10)
        trend_c = np.random.normal(0, 2, 10)
        trend_f = np.concatenate([np.linspace(0, 5, 5), np.linspace(5, -3, 5)]) + np.random.normal(0, 2, 10)
    elif pattern == "flat_low":
        trend_a = np.random.normal(0, 1.5, 10)
        trend_c = np.random.normal(0, 2, 10)
        trend_f = np.random.normal(0, 1.5, 10)
    elif pattern == "erratic":
        trend_a = np.random.normal(0, 5, 10)
        trend_c = np.random.normal(0, 3, 10)
        trend_f = np.random.normal(0, 6, 10)
    elif pattern == "gradually_declining":
        trend_a = np.linspace(0, -6, 10) + np.random.normal(0, 1.5, 10)
        trend_c = np.linspace(0, 3, 10) + np.random.normal(0, 1.5, 10)
        trend_f = np.linspace(0, -4, 10) + np.random.normal(0, 1.5, 10)
    elif pattern == "stable_high":
        trend_a = np.random.normal(0, 1, 10)
        trend_c = np.random.normal(0, 1.5, 10)
        trend_f = np.random.normal(0, 1.5, 10)
    else:
        trend_a = np.random.normal(0, 3, 10)
        trend_c = np.random.normal(0, 2.5, 10)
        trend_f = np.random.normal(0, 3, 10)

    arousal_seq = np.clip(base_arousal + trend_a, 0, 100).astype(int).tolist()
    focus_seq = np.clip(base_focus + trend_f, 0, 100).astype(int).tolist()
    calm_seq = np.clip(base_calm + trend_c, 0, 100).astype(int).tolist()

    return [{"t": i, "arousal": arousal_seq[i], "focus": focus_seq[i], "calm": calm_seq[i]} for i in range(10)]


def generate_eeg_bands(state_label: str):
    """基于真实波形统计生成EEG频带能量"""
    prof = STATE_WAVEFORM_PROFILES[state_label]
    alpha_rel = random.uniform(*prof["alpha_rel_range"])
    beta_theta = random.uniform(*prof["beta_theta_range"])
    delta_ratio = random.uniform(*prof["delta_ratio_range"])
    total_power = random.uniform(*prof["total_power_range"])

    theta_ratio = random.uniform(0.1, 0.25)
    beta_ratio = beta_theta * theta_ratio
    remaining = 1.0 - delta_ratio - theta_ratio - beta_ratio
    alpha_ratio = alpha_rel
    gamma_ratio = max(0, remaining - alpha_ratio)

    lowAlpha_ratio = alpha_ratio * random.uniform(0.4, 0.6)
    highAlpha_ratio = alpha_ratio - lowAlpha_ratio
    lowBeta_ratio = beta_ratio * random.uniform(0.4, 0.6)
    highBeta_ratio = beta_ratio - lowBeta_ratio
    lowGamma_ratio = gamma_ratio * random.uniform(0.5, 0.7)
    highGamma_ratio = gamma_ratio - lowGamma_ratio

    bands = {
        "delta": int(delta_ratio * total_power),
        "theta": int(theta_ratio * total_power),
        "lowAlpha": int(lowAlpha_ratio * total_power),
        "highAlpha": int(highAlpha_ratio * total_power),
        "lowBeta": int(lowBeta_ratio * total_power),
        "highBeta": int(highBeta_ratio * total_power),
        "lowGamma": int(lowGamma_ratio * total_power),
        "highGamma": int(highGamma_ratio * total_power),
    }
    actual_total = sum(bands.values())
    actual_alpha_rel = (bands["lowAlpha"] + bands["highAlpha"]) / actual_total
    actual_beta_theta = (bands["lowBeta"] + bands["highBeta"]) / max(bands["theta"], 1)
    return bands, actual_total, actual_alpha_rel, actual_beta_theta


def make_sample(idx: int, state_label: str, arousal: int, focus: int, calm: int,
                sleep_hours: float, avail_min: int, scenario=None, utterance=None,
                source="synthetic", annotator="generator-v1"):
    meta = STATE_META[state_label]
    if scenario is None:
        scenario = random.choice(meta["scenario_pool"])
    if utterance is None:
        utterance = random.choice(meta["utterance_pool"])

    bio_sequence = generate_10sec_sequence(state_label, arousal, focus, calm)

    arousal_vals = [p["arousal"] for p in bio_sequence]
    focus_vals = [p["focus"] for p in bio_sequence]
    calm_vals = [p["calm"] for p in bio_sequence]

    arousal_mean = float(np.mean(arousal_vals))
    focus_mean = float(np.mean(focus_vals))
    calm_mean = float(np.mean(calm_vals))

    arousal_input = int(round(arousal_mean))
    focus_input = int(round(focus_mean))
    calm_input = int(round(calm_mean))

    eeg_bands, total_power, actual_alpha_rel, actual_beta_theta = generate_eeg_bands(state_label)
    focus_cv = float(np.std(focus_vals) / max(np.mean(focus_vals), 1))

    return {
        "id": f"eval-{idx:04d}",
        "input": {
            "arousal": arousal_input,
            "focus": focus_input,
            "calm": calm_input,
            "sleepHours": round(sleep_hours, 1),
            "availableMinutes": avail_min,
            "eeg": {
                "attention": focus_input,
                "meditation": calm_input,
                "signalQuality": random.randint(50, 200),
                "bands": eeg_bands,
                "totalPower": int(total_power),
                "alphaRelative": round(actual_alpha_rel, 4),
                "betaThetaRatio": round(actual_beta_theta, 4),
            }
        },
        "bioSequence": bio_sequence,
        "waveformStats": {
            "arousalMean": round(arousal_mean, 2),
            "arousalStd": round(float(np.std(arousal_vals)), 2),
            "arousalTrend": round(float(np.polyfit(range(10), arousal_vals, 1)[0]), 4),
            "focusMean": round(focus_mean, 2),
            "focusStd": round(float(np.std(focus_vals)), 2),
            "focusCv": round(focus_cv, 4),
            "focusTrend": round(float(np.polyfit(range(10), focus_vals, 1)[0]), 4),
            "calmMean": round(calm_mean, 2),
            "calmStd": round(float(np.std(calm_vals)), 2),
            "calmTrend": round(float(np.polyfit(range(10), calm_vals, 1)[0]), 4),
        },
        "label": state_label,
        "scenario": scenario,
        "userUtterance": utterance,
        "expect": {
            "dominantGoal": meta["dominantGoal"],
            "weightsOrder": meta["weightsOrder"],
            "crisis": False,
            "creativityPlausible": state_label in ["revved", "wired", "scattered"]
        },
        "meta": {
            "source": source,
            "annotator": annotator,
            "reviewed": False,
            "waveformProfile": STATE_WAVEFORM_PROFILES[state_label]["trend_pattern"]
        }
    }


def generate_state_samples(count_per_state: int = 25, include_boundary: bool = True, include_conflict: bool = True):
    """生成主评测集样本"""
    samples = []
    idx = 1

    # 8类均衡样本
    for state_label in STATE_META.keys():
        ranges = STATE_RANGES[state_label]
        success = 0
        attempts = 0
        while success < count_per_state and attempts < 200:
            a = random.randint(*ranges["arousal"])
            f = random.randint(*ranges["focus"])
            c = random.randint(*ranges["calm"])
            s = round(random.uniform(*ranges["sleepHours"]), 1)
            m = random.randint(*ranges["availableMinutes"])

            sample = make_sample(idx, state_label, a, f, c, s, m)
            if assessState(sample["input"]["arousal"], sample["input"]["focus"],
                          sample["input"]["calm"], sample["input"]["sleepHours"]) == state_label:
                samples.append(sample)
                idx += 1
                success += 1
            attempts += 1

    # 边界样本（可扩展）
    if include_boundary:
        boundary_specs = [
            ("depleted", 50, 60, 60, 5.4, 15, "sleep=5.4边界"),
            ("neutral", 50, 60, 60, 5.5, 15, "sleep=5.5边界"),
            ("wired", 75, 50, 45, 7.0, 10, "arousal=75,calm<50"),
            ("revved", 75, 50, 50, 7.0, 10, "arousal=75,calm>=50"),
            ("foggy", 40, 39, 60, 7.0, 15, "focus<40,arousal<50"),
            ("scattered", 50, 39, 60, 7.0, 15, "focus<40,arousal>=50"),
            ("dimming", 34, 60, 60, 7.0, 20, "arousal<35,calm>=50"),
            ("still", 40, 60, 70, 7.0, 20, "calm>=70,arousal<55"),
        ]
        for spec in boundary_specs:
            label, a, f, c, s, m, note = spec
            sample = make_sample(idx, label, a, f, c, s, m,
                                scenario="边界测试", utterance=f"边界: {note}",
                                source="boundary", annotator="handcrafted")
            if assessState(sample["input"]["arousal"], sample["input"]["focus"],
                          sample["input"]["calm"], sample["input"]["sleepHours"]) == label:
                samples.append(sample)
                idx += 1

    # 冲突样本（可扩展）
    if include_conflict:
        conflict_specs = [
            ("depleted", 85, 20, 30, 4.0, 10, "sleep<5.5一票否决高唤醒"),
            ("depleted", 20, 60, 80, 4.5, 20, "sleep<5.5优先于still"),
            ("wired", 80, 30, 40, 7.0, 10, "高唤醒优先于低专注"),
            ("foggy", 30, 30, 40, 7.0, 15, "低专注优先于低唤醒"),
        ]
        for spec in conflict_specs:
            label, a, f, c, s, m, note = spec
            sample = make_sample(idx, label, a, f, c, s, m,
                                scenario="冲突测试", utterance=f"冲突: {note}",
                                source="conflict", annotator="handcrafted")
            sample["meta"]["conflictNote"] = note
            if assessState(sample["input"]["arousal"], sample["input"]["focus"],
                          sample["input"]["calm"], sample["input"]["sleepHours"]) == label:
                samples.append(sample)
                idx += 1

    return samples


def generate_timeseries_session(session_id: str, target_goal: str, duration_sec: int, positive: bool = True):
    """生成时间序列演化样本"""
    if target_goal == "calm":
        start = {"arousal": 80, "focus": 50, "calm": 30}
        target = {"arousal": 34, "focus": 60, "calm": 75}
    elif target_goal == "focus":
        start = {"arousal": 60, "focus": 30, "calm": 50}
        target = {"arousal": 55, "focus": 82, "calm": 60}
    else:
        start = {"arousal": 50, "focus": 40, "calm": 40}
        target = {"arousal": 26, "focus": 40, "calm": 70}

    samples = []
    current = dict(start)
    for t in range(duration_sec):
        if positive:
            for key in current:
                diff = target[key] - current[key]
                current[key] += diff * 0.018 + random.uniform(-1.1, 1.1)
                current[key] = max(0, min(100, current[key]))
        else:
            if random.random() < 0.3:
                for key in current:
                    diff = target[key] - current[key]
                    current[key] += diff * 0.005 + random.uniform(-2, 2)
            else:
                for key in current:
                    current[key] += random.uniform(-3, 3)
            for key in current:
                current[key] = max(0, min(100, current[key]))
        samples.append({"t": t, "arousal": round(current["arousal"], 2),
                       "focus": round(current["focus"], 2), "calm": round(current["calm"], 2)})

    return {
        "sessionId": session_id,
        "targetGoal": target_goal,
        "durationSec": duration_sec,
        "positive": positive,
        "startState": start,
        "endState": {"arousal": round(samples[-1]["arousal"], 2),
                    "focus": round(samples[-1]["focus"], 2),
                    "calm": round(samples[-1]["calm"], 2)},
        "samples": samples,
        "meta": {"source": "synthetic", "annotator": "evolution-model-v1"}
    }


def main():
    parser = argparse.ArgumentParser(description="NeuroFlow 评测集合成数据生成器")
    parser.add_argument("--count", type=int, default=240, help="每类状态生成的样本数")
    parser.add_argument("--output", type=str, default="eval/states.jsonl", help="输出文件路径")
    parser.add_argument("--timeseries", action="store_true", help="生成时间序列样本")
    parser.add_argument("--ts-count", type=int, default=20, help="时间序列样本数")
    parser.add_argument("--ts-output", type=str, default="eval/timeseries/", help="时间序列输出目录")
    parser.add_argument("--seed", type=int, default=42, help="随机种子")
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    if args.timeseries:
        out_dir = Path(args.ts_output)
        out_dir.mkdir(parents=True, exist_ok=True)
        idx = 1
        for goal in ["calm", "focus", "sleep"]:
            for _ in range(args.ts_count // 3 + 1):
                for positive in [True, False]:
                    duration = random.choice([60, 120, 180, 300, 600, 900])
                    session = generate_timeseries_session(f"session-{idx:04d}", goal, duration, positive)
                    with open(out_dir / f"{session['sessionId']}.json", "w", encoding="utf-8") as f:
                        json.dump(session, f, ensure_ascii=False, indent=2)
                    idx += 1
        print(f"时间序列样本已保存到 {out_dir}，共 {idx-1} 条")
    else:
        samples = generate_state_samples(count_per_state=args.count // 8)
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            for s in samples:
                f.write(json.dumps(s, ensure_ascii=False) + "\n")
        print(f"状态评测集已保存到 {out_path}，共 {len(samples)} 条")

        # 验证
        valid = sum(1 for s in samples
                   if assessState(s["input"]["arousal"], s["input"]["focus"],
                                 s["input"]["calm"], s["input"]["sleepHours"]) == s["label"])
        print(f"标签一致性: {valid}/{len(samples)} ({valid/len(samples)*100:.1f}%)")


if __name__ == "__main__":
    main()
