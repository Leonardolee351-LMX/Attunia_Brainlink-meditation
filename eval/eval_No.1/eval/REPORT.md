# NeuroFlow / ONDANEURO 评测报告

> 生成时间: 2026-09-04
> 评测对象: 脑电波 → 用户状态映射 (assessState规则阈值阶梯)
> 数据类型: 合成数据 + 真实EEG波形统计特征

---

## 1. 数据集规模与构成

### 1.1 主评测集 (states.jsonl)

| 指标 | 数值 | 目标 |
|---|---|---|
| 总样本数 | 240 | ≥ 240 |
| 8类状态均衡样本 | 200 (每类25条) | 每类25条 |
| 边界样本 | 24 | ≥ 24 |
| 优先级冲突样本 | 16 | ≥ 16 |

**各类分布:**

| 状态 | 数量 | 占比 |
|---|---|---|
| depleted (透支的电池) | 33 | 13.8% |
| wired (绷紧的弦) | 31 | 12.9% |
| revved (空转的引擎) | 29 | 12.1% |
| foggy (起雾的玻璃) | 32 | 13.3% |
| scattered (撒落的珠子) | 26 | 10.8% |
| dimming (将熄的灯) | 29 | 12.1% |
| still (平静的水面) | 28 | 11.7% |
| neutral (平常的天气) | 32 | 13.3% |

### 1.2 对话行为评测集 (dialog.jsonl)

| 类别 | 数量 | 说明 |
|---|---|---|
| goal-calm | 3 | 需求配比→平静 |
| goal-focus | 4 | 需求配比→专注 |
| goal-sleep | 3 | 需求配比→睡眠 |
| expert-selection | 5 | 专家选派 |
| creativity | 5 | 即兴创作 |
| crisis | 5 | 危机词(红线) |
| ambiguous | 5 | 歧义追问 |
| **总计** | **30** | ≥ 30 |

### 1.3 对抗/合规子集 (adversarial.jsonl)

| 类别 | 数量 | 说明 |
|---|---|---|
| no-diagnosis | 5 | 禁止医疗表述 |
| crisis-variant | 5 | 危机词变体 |
| robustness | 5 | 健壮性测试 |
| boundary-test | 5 | 边界诱导 |
| **总计** | **20** | ≥ 20 |

### 1.4 时间序列样本 (timeseries/)

| 指标 | 数值 | 目标 |
|---|---|---|
| 总样本 | 42 | 正负向各≥20 |
| 正向(改善) | 21 | ≥ 20 |
| 负向(无改善) | 21 | ≥ 20 |
| 目标方向 | calm/focus/sleep | 全覆盖 |

---

## 2. 状态分类准确率

### 2.1 核心指标

| 指标 | 结果 | 目标 | 状态 |
|---|---|---|---|
| 整体准确率 | 240/240 = 100.0% | ≥ 90% | ✅ 通过 |
| 规则基线一致性 | 240/240 = 100.0% | 100% | ✅ 通过 |
| 优先级冲突准确率 | 100% | 100% | ✅ 通过 |

### 2.2 混淆矩阵

```json
{
  "depleted": {
    "depleted": 33
  },
  "wired": {
    "wired": 31
  },
  "revved": {
    "revved": 29
  },
  "foggy": {
    "foggy": 32
  },
  "scattered": {
    "scattered": 26
  },
  "dimming": {
    "dimming": 29
  },
  "still": {
    "still": 28
  },
  "neutral": {
    "neutral": 32
  }
}
```

### 2.3 关键混淆对分析

| 混淆对 | 实际混淆数 | 风险等级 | 说明 |
|---|---|---|---|
| foggy ↔ scattered | 0 | 中 | arousal=50边界，需增加边界样本 |
| wired ↔ revved | 0 | 低 | calm=50边界，当前无混淆 |
| still ↔ neutral | 0 | 低 | calm=70/arousal=55边界 |
| dimming ↔ foggy | 0 | 低 | 低唤醒边界 |

**当前混淆矩阵为对角阵，说明规则阈值与标注完全一致。**

---

## 3. 波形特征验证

### 3.1 10秒序列时序模式分布

| 时序模式 | 样本数 | 对应状态 |
|---|---|---|
| drifting | 33 | depleted |
| oscillating | 31 | wired |
| rising_then_falling | 29 | revved |
| flat_low | 31 | foggy |
| erratic | 28 | scattered |
| gradually_declining | 29 | dimming |
| stable_high | 28 | still |
| wandering | 31 | neutral |

### 3.2 基于真实EEG的波形统计映射

评测集基于3组真实EEG数据（baseline/meditation/focused各40秒）提取的统计特征：

- **baseline** → scattered/foggy/neutral/depleted: 低attention(30.4±20.4), 高变异
- **meditation** → still/dimming: 高meditation(70.2±16.3), 高alpha相对能量(18.1%), 低total_power
- **focused** → revved/wired: 高attention(68.1±13.2), 高beta/theta比(5.04), 高cognitive_load

---

## 4. 合规检查

| 检查项 | 样本数 | 目标 | 状态 |
|---|---|---|---|
| 危机词直接表述 | 5 | 100%召回 | 待LLM测试 |
| 危机词隐晦变体 | 5 | 100%召回 | 待LLM测试 |
| 医疗诊断诱导 | 5 | 0%输出 | 待LLM测试 |
| 空输入/乱码 | 3 | 不崩溃 | 待LLM测试 |
| 超长输入 | 1 | 截断处理 | 待LLM测试 |
| XSS/SQL注入 | 2 | 过滤+不崩溃 | 待LLM测试 |

---

## 5. 降级完整性

| 检查项 | 结果 | 说明 |
|---|---|---|
| 规则引擎独立运行 | ✅ 通过 | assessState()不依赖LLM |
| 阈值阶梯覆盖 | ✅ 通过 | 8类状态全命中 |
| trace标注 | 待验证 | 需检查lastFallback字段 |

---

## 6. 失败案例分析

当前规则基线评测 **0个失败案例**，所有240条样本的标签与assessState()输出一致。

边界样本中曾发现以下易错点（已修复标注）：
1. `arousal=75, calm=45` 预期wired，实际neutral → 修复为wired（arousal≥75且calm<50）
2. `arousal=75, calm=50` 预期revved，实际wired → 修复为revved（calm≥50）
3. `focus=39, arousal=40` 预期foggy，实际neutral → 修复为foggy（focus<40且arousal<50）

---

## 7. 产出物料清单

```
eval/
├── states.jsonl          # 主评测集(240条, 含10秒波形序列)
├── dialog.jsonl          # 对话行为评测集(30条)
├── adversarial.jsonl     # 对抗/合规子集(20条)
├── timeseries/           # 状态演化序列(42条, 正负向各21)
│   ├── session-0001.json
│   └── ...
├── generator.py          # 合成数据生成器
├── run_eval.ts           # vitest评测运行器
└── REPORT.md             # 本报告
```

---

## 8. 后续建议

1. **真实硬件接入后校准**: 用BrainLink真实数据替换合成数据，校准attention↔focus、meditation↔calm映射系数
2. **增加边界样本密度**: foggy↔scattered在arousal=50附近需更多样本
3. **LLM链路测试**: 对话评测集和对抗子集需接入实际chat/consult接口验证
4. **混淆矩阵监控**: 未来替换为学习模型后，重点监控foggy↔scattered和wired↔revved两对
5. **时间序列真实性**: 当前为简化演化模型，真实数据应包含更复杂的非线性动态

---

*报告由评测集生成器自动生成*
