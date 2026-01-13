"""
数据提取脚本
从匹配报告中提取所有文件的数据
"""

import json
import csv
import warnings
import sys
from pathlib import Path

# 添加 backend 目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import MATCHING_REPORT_FILE, PACEMAKER_DATA_FILE
from core.extractors import process_file


def extract_all_data():
    """从匹配报告中提取所有文件的数据"""
    if not MATCHING_REPORT_FILE.exists():
        print(f"错误: 匹配报告不存在 ({MATCHING_REPORT_FILE})")
        print("请先运行 match_templates.py")
        return []
    
    with open(MATCHING_REPORT_FILE, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        files = [
            r for r in reader
            if "Match" in r["Status"] and not r["Filename"].startswith("~$")
        ]

    print(f"开始全量提取，共 {len(files)} 个文件...")
    
    json_output = []
    for i, file in enumerate(files):
        if (i + 1) % 50 == 0:
            print(f"已处理 {i + 1}/{len(files)}...")
        json_output.append(process_file(file["Full Path"], file["Filename"]))

    with open(PACEMAKER_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(json_output, f, ensure_ascii=False, indent=2)
    
    print(f"提取完成。已保存到 {PACEMAKER_DATA_FILE}")
    return json_output


if __name__ == "__main__":
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        extract_all_data()
