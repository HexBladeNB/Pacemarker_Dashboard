"""
Pacemaker Dashboard Backend - 主入口
提供统一的接口来运行数据处理流程

用法:
    python main.py            # 全量处理（匹配+提取）
    python main.py --watch    # 监控模式（自动更新）
"""

import argparse
import json
import os
import hashlib
import warnings
import sys
from pathlib import Path
from datetime import datetime

# 确保导入路径正确
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    DATA_REPOSITORY, PACEMAKER_DATA_FILE, 
    MATCHING_REPORT_FILE, PROCESSED_FILES_FILE
)
from scripts.match_templates import match_all_files
from scripts.extract_data import extract_all_data
from core.extractors import process_file


def get_file_hash(filepath):
    """计算文件的 MD5 哈希值"""
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        buf = f.read(65536)
        while len(buf) > 0:
            hasher.update(buf)
            buf = f.read(65536)
    return hasher.hexdigest()


def load_processed_files():
    """加载已处理文件的记录"""
    if PROCESSED_FILES_FILE.exists():
        with open(PROCESSED_FILES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_processed_files(data):
    """保存已处理文件的记录"""
    with open(PROCESSED_FILES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def find_new_or_modified_files():
    """查找新增或修改的文件"""
    processed = load_processed_files()
    new_files = []
    modified_files = []
    
    for root, dirs, files in os.walk(DATA_REPOSITORY):
        for f in files:
            if not f.lower().endswith(('.xls', '.xlsx')):
                continue
            if f.startswith('~$'):
                continue
                
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, start=DATA_REPOSITORY.parent)
            file_hash = get_file_hash(full_path)
            
            if rel_path not in processed:
                new_files.append((rel_path, f, file_hash))
            elif processed[rel_path]['hash'] != file_hash:
                modified_files.append((rel_path, f, file_hash))
    
    return new_files, modified_files


def incremental_update():
    """增量更新：只处理新增或修改的文件"""
    new_files, modified_files = find_new_or_modified_files()
    
    if not new_files and not modified_files:
        print("没有检测到新增或修改的文件。")
        return
    
    print(f"检测到 {len(new_files)} 个新文件，{len(modified_files)} 个修改的文件。")
    
    # 加载现有数据
    existing_data = []
    if PACEMAKER_DATA_FILE.exists():
        with open(PACEMAKER_DATA_FILE, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
    
    # 创建路径到索引的映射
    path_to_index = {}
    for i, item in enumerate(existing_data):
        if 'meta' in item and 'path' in item['meta']:
            path_to_index[item['meta']['path']] = i
    
    processed = load_processed_files()
    
    # 处理新文件
    for rel_path, filename, file_hash in new_files:
        print(f"处理新文件: {filename}")
        result = process_file(rel_path, filename)
        existing_data.append(result)
        processed[rel_path] = {'hash': file_hash, 'last_processed': datetime.now().isoformat()}
    
    # 处理修改的文件
    for rel_path, filename, file_hash in modified_files:
        print(f"更新文件: {filename}")
        result = process_file(rel_path, filename)
        if rel_path in path_to_index:
            existing_data[path_to_index[rel_path]] = result
        else:
            existing_data.append(result)
        processed[rel_path] = {'hash': file_hash, 'last_processed': datetime.now().isoformat()}
    
    # 保存更新后的数据
    with open(PACEMAKER_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)
    
    save_processed_files(processed)
    print(f"增量更新完成。共 {len(existing_data)} 条记录。")


def full_process():
    """全量处理：匹配模板 + 提取数据"""
    print("=" * 50)
    print("Pacemaker Dashboard 后端数据处理")
    print("=" * 50)
    print()
    
    print("[1/2] 匹配模板...")
    match_all_files()
    print()
    
    print("[2/2] 提取数据...")
    extract_all_data()
    print()
    
    # 建立已处理文件记录（用于增量更新）
    print("建立文件索引...")
    processed = {}
    for root, dirs, files in os.walk(DATA_REPOSITORY):
        for f in files:
            if not f.lower().endswith(('.xls', '.xlsx')):
                continue
            if f.startswith('~$'):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, start=DATA_REPOSITORY.parent)
            file_hash = get_file_hash(full_path)
            processed[rel_path] = {'hash': file_hash, 'last_processed': datetime.now().isoformat()}
    
    save_processed_files(processed)
    print(f"文件索引已建立，共 {len(processed)} 个文件。")
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
            incremental_update()
        elif args.match:
            match_all_files()
        elif args.extract:
            extract_all_data()
        else:
            full_process()


if __name__ == "__main__":
    main()
