#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量替换Markdown文件的一级标题为文件名
"""
import os
import re
from pathlib import Path

TARGET_DIRS = [
    r"e:\Users\xiongaox\Downloads\Orbis\src\data\cases\buchuiniu\工作事业",
    r"e:\Users\xiongaox\Downloads\Orbis\src\data\cases\buchuiniu\官司诉讼"
]

def replace_header(filepath: Path) -> bool:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = content.split('\n')
        filename_no_ext = filepath.stem
        new_header = f"# {filename_no_ext}"
        
        header_found = False
        new_lines = []
        
        # 查找并替换第一个一级标题
        for i, line in enumerate(lines):
            if not header_found and line.strip().startswith('# ') and not line.strip().startswith('## '):
                new_lines.append(new_header)
                header_found = True
            else:
                new_lines.append(line)
        
        # 如果没找到一级标题，插入到开头
        if not header_found:
            new_lines.insert(0, "")
            new_lines.insert(0, new_header)
            
        new_content = '\n'.join(new_lines)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        return False
        
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    total = 0
    modified = 0
    for dir_path in TARGET_DIRS:
        p = Path(dir_path)
        if not p.exists():
            print(f"Directory not found: {p}")
            continue
            
        print(f"Processing directory: {p.name}")
        for md_file in p.glob('*.md'):
            total += 1
            if replace_header(md_file):
                modified += 1
                
    print(f"Done. Processed {total} files, modified {modified} files.")

if __name__ == '__main__':
    main()
