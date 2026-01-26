# Agent Skills 技能文档

此目录包含扩展智能体能力的专用“技能”。每项技能都是一套专注的工作流或工具集，旨在强制执行最佳实践并确保高质量输出。

## 核心流程 (Core Process)
*必须严格遵守的铁律。*

| 技能 | 描述 |
|-------|-------------|
| **[using-superpowers](./using-superpowers/SKILL.md)** | **超能力引擎 (Meta-Skill)**：入口技能。要求在执行*任何*行动前先检查是否有适用技能。防止“盲目猜测”并强制执行标准流程。 |
| **[test-driven-development](./test-driven-development/SKILL.md)** | **TDD 铁律**：“没有失败的测试，就不能写生产代码。”强制执行红-绿-重构 (Red-Green-Refactor) 循环。 |
| **[verification-before-completion](./verification-before-completion/SKILL.md)** | **完成前验证**：宣布成功的门禁。“先运行命令，看输出，**然后**再从结论。”拒绝“应该修复了”这种模糊说法。 |
| **[systematic-debugging](./systematic-debugging/SKILL.md)** | **系统化调试**：禁止猜测。强制执行 4 阶段调试（根本原因 → 模式 → 假设 → 修复）。严禁在未证明根本原因前尝试修复。 |
| **[chinese-logic-guardian](./chinese-logic-guardian/SKILL.md)** | **中文逻辑守护**：语言防火墙。强制 AI 完全使用简体中文进行思考和回复，特别针对中文业务逻辑或玄学（八字/奇门）优化。 |

## 规划与设计 (Planning & Design)
*在写代码前使用。*

| 技能 | 描述 |
|-------|-------------|
| **[brainstorming](./brainstorming/SKILL.md)** | **头脑风暴**：通过交互式对话将想法转化为经确认的设计方案。防止基于“假设”进行开发。 |
| **[writing-plans](./writing-plans/SKILL.md)** | **编写计划**：为其他智能体通过 `executing-plans` 执行而创建详细的、原子化的实施计划 (`docs/plans/*.md`)。 |
| **[planning-with-files](./planning-with-files/SKILL.md)** | **文件规划**：Manus 风格的规划模式。使用持久化文件 (`task_plan.md`, `findings.md`) 管理复杂的多步骤任务。 |
| **[ui-ux-pro-max](./ui-ux-pro-max/SKILL.md)** | **UI/UX 设计大师**：包含大量 UI 风格、配色方案和特定技术栈（Tailwind, Shadcn 等）最佳实践的设计知识库。 |

## 执行与工作流 (Execution & Workflow)
*用于管理复杂任务。*

| 技能 | 描述 |
|-------|-------------|
| **[subagent-driven-development](./subagent-driven-development/SKILL.md)** | **子智能体驱动开发**：高质量模式。为计划中的*每个*任务指派新的子智能体，并在任务间自动进行“规范符合性”和“代码质量”双重审查。 |
| **[executing-plans](./executing-plans/SKILL.md)** | **执行计划**：分批次执行已编写的计划，并包含人工审查检查点。适合长会话任务。 |
| **[dispatching-parallel-agents](./dispatching-parallel-agents/SKILL.md)** | **并行调度**：生成多个独立的智能体同时处理不相关的任务（例如：同时修复 3 个不同的测试失败）。 |

## 编码与重构 (Coding & Refactoring)
*特定技术操作。*

| 技能 | 描述 |
|-------|-------------|
| **[component-refactoring](./component-refactoring/SKILL.md)** | **组件重构**：专门用于重构高复杂度 React 组件（复杂度 > 50）的标准工作流。 |
| **[using-git-worktrees](./using-git-worktrees/SKILL.md)** | **Git 工作树**：创建隔离的 Git 工作树进行并行功能开发，避免污染主工作区。 |

## 审查与完成 (Review & Completion)
*确保集成前的质量。*

| 技能 | 描述 |
|-------|-------------|
| **[requesting-code-review](./requesting-code-review/SKILL.md)** | **请求审查**：在认为“完成”前，主动指派一个子智能体审查自己的代码，实现自我纠错。 |
| **[receiving-code-review](./receiving-code-review/SKILL.md)** | **接收审查**：处理反馈的协议。“先验证再实施”——防止盲从错误的审查意见，坚持技术正确性。 |
| **[finishing-a-development-branch](./finishing-a-development-branch/SKILL.md)** | **结束分支**：结构化的收尾流程。验证测试，并提供标准化的合并/PR/清理选项。 |

## 元技能 / 维护 (Meta / Maintenance)
| 技能 | 描述 |
|-------|-------------|
| **[writing-skills](./writing-skills/SKILL.md)** | **编写技能**：用于创建或编辑*这些*技能文件的 TDD 流程。确保写出来的文档是 AI 真正能执行的。 |
