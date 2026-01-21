import os
import re

target_dir = r"e:\Users\xiongaox\Downloads\Orbis\notes\buchuiniu\出行出国"

def parse_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 1. Title
    title = ""
    if lines and lines[0].startswith("#"):
        title = lines[0].strip()
        start_idx = 1
    else:
        start_idx = 0

    # 2. Chart Info
    chart_info = []
    # Keywords for chart info
    chart_keywords = ["公元", "干支", "旬空", "值符", "求测人年命"] 
    # Note: "求测人年命" sometimes appears in body, sometimes in chart info. 
    # But usually chart info is purely the time/structure. 
    # Let's stick to standard chart headers.
    chart_keywords_strict = ["公元", "干支", "旬空", "值符"]
    
    current_idx = start_idx
    while current_idx < len(lines):
        line = lines[current_idx].strip()
        if not line:
            current_idx += 1
            continue
            
        # Check if line starts with keyword
        is_chart = False
        for kw in chart_keywords_strict:
            if line.startswith(kw):
                is_chart = True
                break
        
        if is_chart:
            chart_info.append(line)
            current_idx += 1
        else:
            break
            
    # 3. Body Analysis
    # Remaining lines are the body
    body_lines = [l.strip() for l in lines[current_idx:] if l.strip()]
    
    # We need to classify paragraphs into: Background, Question, Analysis, Feedback
    background = []
    question = []
    analysis = []
    feedback = []
    
    # State machine or heuristic scan
    # Process from the end for Feedback
    # Process from the start for Background/Question vs Analysis
    
    # Heuristic for Feedback: 
    # Starts with "反馈", "后", date strings like "29日", "11月", etc at the END of text.
    
    remaining_body = body_lines
    
    # Extract Feedback from end
    while remaining_body:
        last_para = remaining_body[-1]
        is_feedback = False
        if re.match(r'^(反馈|后|[\d]+月[\d]+日|[\d]+日|.*反馈)', last_para):
            is_feedback = True
        elif "反馈" in last_para[:10]:
            is_feedback = True
            
        if is_feedback:
            feedback.insert(0, last_para) # Prepend to feedback list
            remaining_body.pop()
        else:
            break
            
    # Extract Analysis from remaining
    # Analysis usually starts with "分析", "我看", "为什么", "断", "答复", "解析"
    # or just follows Background/Question
    
    analysis_start_idx = -1
    for i, para in enumerate(remaining_body):
        if re.match(r'^(分析|我看|为什么|断|答复|解析|我的判断|对于此局)', para):
            analysis_start_idx = i
            break
        # Sometimes Analysis is implied if it's long and technical? No, stick to explicit start or logical break.
        
    if analysis_start_idx != -1:
        analysis = remaining_body[analysis_start_idx:]
        bg_q_part = remaining_body[:analysis_start_idx]
    else:
        # If no strict analysis keyword found, assume everything after intro implies analysis?
        # Or maybe the file is just background + analysis?
        # Let's check typical length. Background is usually short.
        # If we can't find marker, maybe split at the first paragraph that looks like Qimen logic?
        # For now, if no marker, put everything in Analysis except first para? 
        # Risky. Let's try to be smart.
        if len(remaining_body) > 1:
             # Assume first para is background/question
             bg_q_part = [remaining_body[0]]
             analysis = remaining_body[1:]
        else:
             bg_q_part = remaining_body
             analysis = []

    # Separate Background and Question from bg_q_part
    # usually 1 or 2 paragraphs.
    
    for para in bg_q_part:
        # Check if paragraph contains explicit question
        # Split logic:
        # If starts with Year/Person info -> Background.
        # If contains "问", "求测" -> Question.
        
        # Simple split: regex split on "问" or "求测" if they act as separators sentences.
        # Example: "求测人XXX。问XXX？"
        
        split_match = re.search(r'(。|，|；)(求测|问|想)(.*)', para)
        if split_match:
            # We found a split point
            # Everything before is background
            # Everything after including match is question
            
            # Find the exact index of split
            sep = split_match.group(1)
            keyword = split_match.group(2)
            rest = split_match.group(3)
            
            # Reconstruct
            # Before split
            pre_text = para[:split_match.start()] + sep
            # After split (Question)
            q_text = keyword + rest
            
            if pre_text.strip():
                background.append(pre_text.strip())
            question.append(q_text.strip())
        else:
            # Whole paragraph
            # If it sounds like a question?
            if "问" in para or "?" in para or "？" in para:
                question.append(para)
            else:
                background.append(para)

    return {
        "title": title,
        "chart_info": chart_info,
        "background": background,
        "question": question,
        "analysis": analysis,
        "feedback": feedback
    }

def rebuild_content(data):
    lines = []
    lines.append(data["title"])
    lines.append("")
    
    lines.append("## 盘内信息")
    for l in data["chart_info"]:
        lines.append(l)
    lines.append("")
    
    # Merge Background and Question if empty? 
    # User requested separate headers.
    
    lines.append("## 背景")
    for l in data["background"]:
        lines.append(l)
        lines.append("")
    
    lines.append("## 求测人问")
    for l in data["question"]:
        lines.append(l)
        lines.append("")
        
    lines.append("## 奇门分析")
    for l in data["analysis"]:
        lines.append(l)
        lines.append("")
        
    lines.append("## 反馈")
    for l in data["feedback"]:
        lines.append(l)
        lines.append("")
        
    return "\n".join(lines).strip()

def main():
    if not os.path.exists(target_dir):
        print("Directory not found")
        return

    for filename in os.listdir(target_dir):
        if not filename.endswith(".md"):
            continue
            
        filepath = os.path.join(target_dir, filename)
        print(f"Processing {filename}...")
        
        try:
            parsed = parse_file(filepath)
            new_content = rebuild_content(parsed)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Reformatted {filename}")
            
        except Exception as e:
            print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    main()
