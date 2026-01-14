# Backend 模块化重构实施计划

将臃肿的 `main.py` 拆分为清晰模块，并优化数据处理流程，消除中间JSON文件，最终仅生成 `patient_records` 文件夹。

## 核心变更

### 1. 模块拆分

| 新模块                 | 内容来源              | 说明                                         |
| ---------------------- | --------------------- | -------------------------------------------- |
| `core/grouping.py`     | `main.py` 第134-246行 | 患者分组逻辑（日期解析、姓名提取、分组排序） |
| `core/file_tracker.py` | `main.py` 第33-129行  | 文件哈希、增量更新逻辑                       |

### 2. 流程优化（消除中间文件）

**现有流程**（4步，2个中间JSON）：
```
match_templates → matching_report.csv
extract_data → raw_pacemaker_data.json  ← 中间文件
process_grouping → pacemaker_data.json  ← 中间文件
split_patient_records → patient_records/
```

**优化流程**（内存管道，无中间JSON）：
```
match_templates → matching_report.csv
                      ↓
              extract_data (返回list)
                      ↓
              group_by_patient (内存处理)
                      ↓
              split_patient_records → patient_records/
```

> [!IMPORTANT]
> 将保留 `matching_report.csv`，因它是模板匹配的调试报告，有诊断价值。

---

## 具体文件变更

### [NEW] [grouping.py](file:///e:/Gemini%20CLI%20实战/Pacemarker_Dashboard/backend/core/grouping.py)

从 `main.py` 提取以下函数：
- `parse_date()`
- `extract_name_from_filename()`
- `is_valid_record()`
- `group_by_registration_id()`
- `sort_by_date()`
- `process_and_split_records()` - 新函数，内存中完成分组+拆分

---

### [NEW] [file_tracker.py](file:///e:/Gemini%20CLI%20实战/Pacemarker_Dashboard/backend/core/file_tracker.py)

从 `main.py` 提取以下函数：
- `get_file_hash()`
- `load_processed_files()`
- `save_processed_files()`
- `find_new_or_modified_files()`

---

### [MODIFY] [main.py](file:///e:/Gemini%20CLI%20实战/Pacemarker_Dashboard/backend/main.py)

精简为约100行的入口脚本：
- 导入新模块
- `full_process()` 调用优化后的内存流程
- `incremental_update()` 调用 `file_tracker` 模块
- 保留 `main()` 和命令行参数解析

---

### [MODIFY] [extract_data.py](file:///e:/Gemini%20CLI%20实战/Pacemarker_Dashboard/backend/scripts/extract_data.py)

- 移除写入 `raw_pacemaker_data.json` 的逻辑
- `extract_all_data()` 改为返回 `list` 供内存管道使用

---

### [MODIFY] [config.py](file:///e:/Gemini%20CLI%20实战/Pacemarker_Dashboard/backend/config.py)

- 移除 `RAW_PACEMAKER_DATA_FILE` 和 `PACEMAKER_DATA_FILE`
- 保留 `PATIENT_RECORDS_DIR` 和 `MATCHING_REPORT_FILE`

---

## 验证方案

### 自动化验证

在项目根目录手动运行：
```powershell
cd e:\Gemini CLI 实战\Pacemarker_Dashboard\backend
python main.py
```

### 验证要点

1. **无中间文件**：`backend/output/` 目录下不再生成 `raw_pacemaker_data.json` 和 `pacemaker_data.json`
2. **输出正确**：`patient_records/` 目录存在且包含与之前相同数量的JSON文件
3. **功能完整**：`--update` 增量更新功能正常工作

### 手动验证步骤

1. 删除现有的 `patient_records` 文件夹
2. 运行 `python main.py`
3. 检查：
   - `patient_records/` 是否生成
   - `backend/output/` 是否只有 `matching_report.csv` 和 `processed_files.json`
   - 抽查几个患者JSON文件内容是否完整
