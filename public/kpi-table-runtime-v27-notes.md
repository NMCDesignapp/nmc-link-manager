# KPI table runtime v27

- Replaces five overlapping table MutationObservers with one incremental observer.
- Existing v21-v26 CSS remains loaded for visual compatibility; old JavaScript runtimes remain in the repository but are no longer loaded.
- Processes only the table affected by a mutation and batches repeated mutations into one animation frame.
- Reuses one header grid per processing pass for semantic, tier/rank, edge and achieved-state marking.
- Natural row-height measurement is cached and reruns only for structural row changes or viewport resize.
- Sticky/mirror header tables skip body processing and row measurement.
- Positive `ĐẠT` cells are full green; negative states such as `CHƯA ĐẠT` and `KHÔNG ĐẠT` are excluded.
- `quy-tvv` and `quy-tn` alone receive the yellow-orange reward-rate hierarchy and separator-row removal.
- Header sublines following `<br>` are parenthesized once and styled italic bright red across Thi đua, Chính sách and CLB detail tables.
