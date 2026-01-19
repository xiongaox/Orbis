import fitz  # PyMuPDF

# 读取 PDF 文件
pdf_path = r"e:\Users\xiongaox\Downloads\Orbis\notes\qimen\奇门遁甲预测_1-201.pdf"
output_path = r"e:\Users\xiongaox\Downloads\Orbis\scripts\pdf_extract.txt"

doc = fitz.open(pdf_path)

# 搜索关键词 - 更具体的旺衰规则
keywords = ["旺相休囚", "九星", "八门", "木旺", "火旺", "金旺", "水旺", "土旺"]

output = []
output.append(f"PDF 共 {len(doc)} 页\n")

# 存储找到的页码和内容
found_content = []

# 遍历每页搜索关键词
for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    
    for keyword in keywords:
        if keyword in text:
            found_content.append((page_num + 1, text))
            break

# 输出找到的页面内容 - 查找五行旺相规则和九星八门
for page_num, text in found_content:
    output.append(f"\n{'='*60}")
    output.append(f"📄 第 {page_num} 页")
    output.append('='*60)
    output.append(text)

doc.close()
output.append(f"\n总共找到 {len(found_content)} 页")

with open(output_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))

print(f"已保存到 {output_path}")
