# 评测集

当前使用哪一版，只看 `CURRENT.json`。

```json
{ "id": "eval_No.2", "dir": "eval_No.2/eval" }
```

换集时：把新目录放到 `eval/` 下，改 `CURRENT.json` 的 `id` 和 `dir`，然后：

```
npm run eval
```

跑分代码在 `eval/run_eval.test.ts` + `api/agents/work-detect.test.ts`，测的是生产代码（`assessState` / `SingleAgent` / `detectCrisis` / `analyzeSession` / `detectWorkNeed`），不要在评测目录里再复制一份规则。

从 `eval/user_data` 真机 CSV 重建 2.0 工作窗：

```
node eval/build_eval_no2.mjs
```

规格：`docs/agent-lab/work-detect.md`。
