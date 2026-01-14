# 整合 group_by_patient.py 到 main.py

将按患者分组和数据清洗逻辑整合到主处理流程中，使 `python main.py` 一步完成全部数据处理。

---

## Proposed Changes

### config.py

#### [MODIFY] [config.py](file:///e:/Gemini%20CLI%20实战/Pacemarker_Dashboard/backend/config.py)

新增文件路径常量：
```python
RAW_PACEMAKER_DATA_FILE = OUTPUT_DIR / "raw_pacemaker_data.json"
GROUPED_DATA_FILE = OUTPUT_DIR / "pacemaker_data.json"
```

---

### extract_data.py

#### [MODIFY] [extract_data.py](file:///e:/Gemini%20CLI%20实战/Pacemarker_Dashboard/backend/scripts/extract_data.py)

- 导入新常量 `RAW_PACEMAKER_DATA_FILE`
- 修改输出路径：原始数据保存到 `raw_pacemaker_data.json`

---

### main.py

#### [MODIFY] [main.py](file:///e:/Gemini%20CLI%20实战/Pacemarker_Dashboard/backend/main.py)

1. **新增导入**：从 `group_by_patient.py` 迁移核心函数
2. **新增函数**：
   - `parse_date()` - 日期解析
   - `extract_name_from_filename()` - 从文件名提取姓名
   - `is_valid_record()` - 数据校验（过滤"玉秀郁"污染）
   - `group_by_registration_id()` - 按登记号分组
   - `sort_by_date()` - 按日期排序
   - `process_grouping()` - 主处理函数
3. **修改 `full_process()`**：在 `[2/2] 提取数据` 后添加 `[3/3] 患者分组`

---

### group_by_patient.py

#### [DELETE] [group_by_patient.py](file:///e:/Gemini%20CLI%20实战/Pacemarker_Dashboard/backend/group_by_patient.py)

功能已整合到 `main.py`，该脚本将被删除。

---

## Verification Plan

### 自动化测试
运行以下命令验证完整流程：
```powershell
cd e:\Gemini CLI 实战\Pacemarker_Dashboard\backend
python main.py
```

预期输出：
1. 生成 `output/raw_pacemaker_data.json`（971条原始记录）
2. 生成 `output/pacemaker_data.json`（643个唯一患者，已清洗）
3. 控制台显示 `过滤脏数据` 和 `多次程控患者数`

### 手动验证
1. 打开 `output/pacemaker_data.json`，确认每个患者记录包含 `登记号`、`姓名`、`程控次数`、`程控记录` 字段
2. 搜索 `"玉秀郁"`，确认污染数据已被过滤
