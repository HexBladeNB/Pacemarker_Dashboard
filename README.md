# Pacemaker Dashboard 🫀

心脏起搏器程控报告数据提取与管理系统

## 📋 项目简介

本项目是一个自动化数据提取工具，用于从医院心脏起搏器程控报告（Excel格式）中批量提取结构化数据。支持多个品牌（美敦力、雅培、波科、百多力、创领等）和多种设备类型（起搏器、ICD、CRT-D、CRT-P）。

## ✨ 核心功能

- **模板匹配**：自动识别 14+ 种不同品牌/型号的报告模板
- **数据提取**：智能解析Excel表格中的参数、测试结果、事件记录
- **增量更新**：仅处理新增或修改的文件，提高效率
- **结构化输出**：输出标准化JSON格式，便于后续分析

## 🏗️ 项目结构

```
Pacemarker_Dashboard/
├── backend/                # 后端核心代码
│   ├── core/               # 核心模块
│   │   ├── extractors.py   # 数据提取器
│   │   ├── handlers.py     # 文件处理器（xls/xlsx）
│   │   └── utils.py        # 工具函数
│   ├── scripts/            # 脚本入口
│   │   ├── match_templates.py  # 模板匹配
│   │   └── extract_data.py     # 数据提取
│   ├── data/               # 配置数据
│   │   └── templates.json  # 模板定义
│   ├── output/             # 输出结果
│   ├── config.py           # 配置文件
│   └── main.py             # 主入口
└── doc/                    # 文档
```

## 🚀 快速开始

### 依赖安装

```bash
pip install openpyxl xlrd pandas
```

### 使用方法

```bash
# 全量处理（模板匹配 + 数据提取）
python backend/main.py

# 增量更新（仅处理新增/修改文件）
python backend/main.py --update

# 仅运行模板匹配
python backend/main.py --match

# 仅运行数据提取
python backend/main.py --extract
```

## 📊 支持的报告类型

| 设备类型 | 支持品牌 |
|---------|---------|
| 起搏器   | 美敦力、雅培、波科、百多力、创领、Micra AV、传导束起搏 |
| ICD     | 美敦力、雅培 |
| CRT-D   | 美敦力、雅培 |
| CRT-P   | 美敦力、雅培 |
| EV-ICD  | 美敦力 |

## 📝 输出格式

```json
{
  "meta": {
    "filename": "xxx.xls",
    "template": "起搏器报告单 （美敦力）.xls",
    "type": "起搏器报告单",
    "brand": "美敦力"
  },
  "basic_params": { ... },
  "test_params": { ... },
  "events": { ... },
  "footer_meta": { ... }
}
```

## 📄 License

MIT License

---

*本项目由 AI 辅助开发，用于医院心电图室程控随访数据管理*
