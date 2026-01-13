# 优化起搏器报告提取脚本 - 修复参数提取失败问题

## 问题诊断

通过调试发现，提取失败的根本原因是 **Excel 合并单元格**：
- 字段（蓝色背景）可能跨多列合并，如 `D6:E6`
- 值单元格也可能合并，如 `F6:H6`  
- 当前 `find_value_smart` 函数遇到 `None`（合并区域的非起始单元格）时**错误地跳过**

**示例**：`睡眠频率（次/分）` 在 D6 列，但由于 D6:E6 合并，E6 读出 `None`，实际值 `OFF` 在 F6。

## Proposed Changes

### [MODIFY] [smart_extract_optimized.py](file:///e:/Gemini%20CLI%20实战/Pacemarker_Dashboard/smart_extract_optimized.py)

修改 `find_value_smart` 函数，将当前逻辑：
```python
# 当前逻辑：遇到 None 或蓝色就停止
for offset in range(1, 6):
    if curr_c >= handler.ncols or handler.is_blue_cell(r, curr_c):
        break
    val = clean_value(handler.get_cell_value(r, curr_c))
    if val:  # 遇到 None 会跳过但继续，问题是遇到蓝色就停了
        return val
```

改为：
```python
# 新逻辑：跳过 None，直到找到有效值或遇到下一个蓝色单元格
for offset in range(1, 8):  # 扩大搜索范围
    curr_c = start_c + offset
    if curr_c >= handler.ncols:
        break
    if handler.is_blue_cell(r, curr_c):
        break  # 遇到下一个字段标签才停止
    val = clean_value(handler.get_cell_value(r, curr_c))
    if val:  # 找到非空值
        return val
return ""  # 真正找不到才返回空
```

> [!NOTE]
> 小表格提取 (`extract_table_in_range`) 逻辑不变，保持现有的完美表现。

## Verification Plan

### 自动测试
运行调试脚本验证修复效果：
```powershell
python debug_missed_values.py
```
预期：`睡眠频率` 和 `电池电压` 都能正确提取到值。

### 抽样验证
运行主提取脚本，抽取 10 份样本验证：
```powershell
python -c "
import smart_extract_optimized as se
import json
import warnings
warnings.simplefilter('ignore')

# 测试几个具体文件
test_files = [
    ('01_data_repository/2025年11月/陈艳琼起搏器报告单 （美敦力）.xlsx', '陈艳琼'),
    ('01_data_repository/2025年12月/吴晓莉 起搏器报告单 （美敦力）.xls', '吴晓莉'),
]
for path, name in test_files:
    data = se.process_file(path, name)
    basic = data.get('basic_params', {}).get('settings', {})
    # 检查关键字段
    print(f'=== {name} ===')
    for key in ['睡眠频率（次/分）', '低限频率（次/分）']:
        print(f'{key}: {basic.get(key, \"NOT FOUND\")}')
"
```
