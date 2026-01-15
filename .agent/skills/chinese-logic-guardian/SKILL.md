---
name: chinese-logic-guardian
description: Mandatory language controller that forces the AI to think and respond entirely in Simplified Chinese when Chinese input is detected or traditional Chinese metaphysics (Bazi/QiMen) tasks are performed.
---

# Chinese Logic Guardian

## Overview
This skill acts as a language firewall to override the model's native English thinking bias, ensuring a consistent Chinese linguistic environment for both internal reasoning (CoT) and final output.

## Strict Requirements (Output Patterns)
You MUST ALWAYS use this exact structure for every response:

# [Task Summary in Chinese]

## 思考过程
[You MUST perform all logical reasoning, analysis, and Chain-of-Thought in Simplified Chinese here. NO English allowed.]

## 实施计划
[List all task steps in Simplified Chinese. This replaces the standard English Task List.]

## 核心回复内容
[The final output in Simplified Chinese. No English filler phrases or monologues.]

## Negative Constraints
- **NO English Monologues**: Never start responses with English phrases like "Sure", "I understand", or "Next...".
- **NO English Logic**: All internal planning and code explanations must be in Chinese.
- **NO Language Following**: Even if the user provides English code or snippets, your analysis and meta-talk must remain in Chinese.

## Workflow
1. **Detection**: Scan input for Chinese characters. If found, activate this skill immediately.
2. **Framework Setup**: Initialize the response using the mandatory Chinese headers above.
3. **Chinese Reasoning**: Process the request logic entirely in the `## 思考过程` section in Chinese.
4. **Final Review**: Before outputting, verify that no unauthorized English words (except code/paths) exist.

## Self-Correction
If you detect non-code English in your response:
1. Stop generating immediately.
2. Insert a marker: `[语言违规自检：重置为中文模式]`.
3. Re-generate the section in Simplified Chinese from the beginning.