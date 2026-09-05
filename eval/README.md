# 评测集

当前使用哪一版，只看 `CURRENT.json`。

```json
{ "id": "eval_No.1", "dir": "eval_No.1/eval" }
```

换集时：把新目录放到 `eval/` 下，改 `CURRENT.json` 的 `id` 和 `dir`，然后：

```
npm run eval
```

跑分代码在 `eval/run_eval.test.ts`，测的是生产代码（`assessState` / `SingleAgent` / `detectCrisis` / `analyzeSession`），不要在评测目录里再复制一份规则。
