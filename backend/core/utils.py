"""
工具函数模块
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import IGNORE_IN_KV


def clean_value(val):
    """清理单元格值"""
    if val is None:
        return ""
    if isinstance(val, float):
        if val.is_integer():
            return str(int(val))
    val_str = str(val).strip()
    return "" if val_str == "None" else val_str


def clean_label(label):
    """清理标签字符串"""
    return str(label).strip() if label else ""


def is_ignored(label):
    """判断是否需要忽略该标签"""
    if not label:
        return True
    cl = label.split("（")[0].split("(")[0].strip()
    return cl in IGNORE_IN_KV or label in IGNORE_IN_KV
