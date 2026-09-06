# eval_No.2

- 承接 eval_No.1 的 states / dialog / adversarial / timeseries。
- 新增 `work_windows.jsonl`：由 `eval/user_data` 真机 CSV（focused / overload / drowsy / baseline）铺成 10 分钟窗。
- 用途：评测 `detectWorkNeed`（超载→冥想减压，走神→专注回笼）。
- 生成：`node eval/build_eval_no2.mjs`

共 8 条工作窗。
