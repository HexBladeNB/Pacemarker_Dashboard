"""
Pacemaker Dashboard Backend - 主入口
提供统一的接口来运行数据处理流程

用法:
    python main.py            # 全量处理
    python main.py --update   # 增量更新
"""

import argparse
import warnings
import sys
from pathlib import Path

# 确保导入路径正确
sys.path.insert(0, str(Path(__file__).parent))

from scripts.match_templates import match_all_files
from scripts.extract_data import extract_all_data
from core.grouping import process_and_split_records
from core.file_tracker import build_file_index


def full_process():
    """全量处理：匹配模板 + 提取数据 + 分组拆分"""
    print("=" * 50)
    print("Pacemaker Dashboard 后端数据处理")
    print("=" * 50)
    print()
    
    print("[1/3] 匹配模板...")
    match_all_files()
    print()
    
    print("[2/3] 提取数据...")
    data = extract_all_data()
    print()
    
    print("[3/3] 按患者分组并拆分...")
    process_and_split_records(data)
    print()
    
    # 建立文件索引（用于增量更新）
    print("建立文件索引...")
    count = build_file_index()
    print(f"文件索引已建立，共 {count} 个文件。")
    print()
    print("全量处理完成！")


def main():
    parser = argparse.ArgumentParser(description='Pacemaker Dashboard 后端数据处理')
    parser.add_argument('--update', '-u', action='store_true', 
                        help='增量更新（只处理新增/修改的文件）')
    parser.add_argument('--match', '-m', action='store_true',
                        help='仅运行模板匹配')
    parser.add_argument('--extract', '-e', action='store_true',
                        help='仅运行数据提取')
    
    args = parser.parse_args()
    
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        
        if args.update:
            print("增量更新模式暂时禁用，请使用全量处理。")
            # TODO: 重构增量更新逻辑以适配新的内存管道
        elif args.match:
            match_all_files()
        elif args.extract:
            data = extract_all_data()
            print(f"提取了 {len(data)} 条记录")
        else:
            full_process()


if __name__ == "__main__":
    main()
