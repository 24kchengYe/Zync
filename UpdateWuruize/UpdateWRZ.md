# UpdateWRZ

本文只记录相对原始 Zync 的增量功能，不按时间流水整理。`UpdateWuruize/` 的定位是说明文档目录；正式运行依赖的 TypeScript / React 源码已收敛到 `frontend/src/`。

## 1. 中文包与中英文切换 / Chinese Package

### 功能是什么

为 Zync 提供统一的中英文切换能力，让核心入口、项目视图、workspace 创建、状态面板、批量控制、初始化钩子、快照、布局和活动流都能随全局语言切换。

### 当前完成进度

当前状态：持续推进。

已交付：新增中文语言包并持续补齐新功能文案；新功能默认走翻译 key，不再优先硬编码英文。

当前边界：仍可能存在少量历史英文文案，后续按功能继续清理。

### 下一版本计划

继续清理残留硬编码文案，并把“新增 UI 先接 i18n”作为后续功能开发约束。

### 产品意义

Zync 是类 tmux 的多 Agent 工作台，不是单页面工具。双语体系能降低多项目、多 workspace、多控制层场景下的理解成本。

## 2. 项目发现与默认入口 / Project Discovery And Default Entry

### 功能是什么

解决“打开 Zync 后先进入哪里”的问题，让用户快速回到已有项目和 workspace 上下文。

### 当前完成进度

当前状态：前端阶段完成。

已交付：首页启动入口卡、Sidebar 项目筛选、项目上下文条、默认项目 / 默认 workspace 前端状态、恢复上次项目的前端兜底逻辑。

当前边界：早期“大卡片式项目发现面板”已不作为最终运行界面保留；当前以 `frontend/src/features/project-entry/ProjectEntryWidgets.tsx` 和 `projectEntryState.ts` 为准。状态仍为前端 localStorage 预览持久化，未下沉数据库。

### 下一版本计划

把最近项目、收藏项目、默认项目和默认 workspace 下沉到正式持久化层。

### 产品意义

多 Agent 产品的高频动作之一是“回到正确现场”。默认入口让 Zync 更像工作台，而不是需要重新找入口的工具壳。

## 3. Global Switcher / Quick Switcher

### 功能是什么

提供全局搜索 / 跳转入口，用来快速切换项目和 workspace。产品计划名仍保留 Quick Switcher，当前前端文案为 Global Switcher。

### 当前完成进度

当前状态：前端阶段完成。

已交付：`mod/ctrl + j` 打开全局切换器；支持项目 / workspace 分组搜索、模糊匹配、预览信息和跳转。

当前边界：最近 / 收藏来源于 workspace history 与 favorite workspace，不是独立任务对象索引；后端索引和任务实体检索未开始。

### 下一版本计划

评估是否引入正式任务实体、后端索引、结果排序策略和持久化召回。

### 产品意义

在多项目、多 workspace 场景里，切换比创建更高频。Global Switcher 把高频跳转收敛到一个入口。

## 4. 状态面板 / Status Panel

### 功能是什么

提供项目级状态观察层，以“项目汇总 + workspace 明细”的方式查看多个 agent CLI 工作位。

### 当前完成进度

当前状态：前端阶段完成。

已交付：项目汇总卡、workspace 表格、workspace detail、主 workspace 纳入统一列表、状态筛选、项目同步状态、创建 workspace 后自动聚焦新工作区。

当前边界：测试通过 / 失败等更细粒度信号还没有完整后端接线；Activity detail 仍是轻量摘要，不是最终 supervisor activity bus。

### 下一版本计划

接入更真实的测试信号、失败原因分类、状态历史和趋势观察。

### 产品意义

类 tmux 多 Agent 产品不能只展示多个终端，还要让用户一眼知道谁在跑、谁在等、谁失败、谁有改动、项目是否落后主分支。

## 5. 命令广播 / 批量控制 / Command Broadcast

### 功能是什么

在状态面板中为多个 workspace 提供统一操作入口，例如未来批量停止、批量 Git Status、批量测试、批量保存快照。

### 当前完成进度

当前状态：前端原型完成。

已交付：批量控制 Tab、多选 workspace、按可见 / 运行中 / 等待输入 / 有改动 / 失败快速选择、动作按钮预览。

当前边界：没有后端批量调度器、没有执行队列、没有真实命令下发。当前动作按钮保持禁用并标记 Preview，不显示虚假的 queued / success。

### 下一版本计划

新增主进程批量调度器、执行队列、结果回传、失败重试和批量快照联动。

### 产品意义

当一个项目下有多个 agent CLI 工作位时，批量控制能把重复操作从“逐个进入 workspace”升级为“项目级统一操作”。

## 6. Workspace 初始化钩子 / Workspace Init Hooks

### 功能是什么

定义新建 workspace 时默认带上的初始化动作。它不是 Recipe，不负责任务编排；它回答的是“一个新 agent CLI 工作位创建后应该自动准备什么”。

### 当前完成进度

当前状态：前端原型完成。

已交付：Project Settings 中的 Init Hooks 配置区、New Workspace 弹窗中的摘要卡、Use Project Init Hooks 开关、Default Panels 的前端可见效果、跳转到配置入口。

当前映射：

- `Build Script` -> `Setup Commands`：创建 workspace 后先跑的一次性准备命令，例如 `pnpm install`、`uv sync`、`pip install -r requirements.txt`。
- `Run Commands` -> `Startup Commands`：workspace 起好后默认启动的命令，例如 `pnpm dev`、`pnpm test --watch`。
- `Open IDE Command` -> `Auto-open IDE`：打开 IDE 的命令，例如 `code .`、`cursor .`。
- `Default Panels`：前端新增配置，用来决定新 workspace 默认打开 Terminal / Explorer / Diff 哪些面板。

当前边界：Setup Commands、Startup Commands、Auto-open IDE 当前只是来源映射和摘要展示；没有新增后端执行器、IPC 或数据库字段。配置仍是 frontend localStorage 预览持久化。

### 下一版本计划

定义主进程执行顺序、hook 启停、失败策略、per-workspace override、项目级正式持久化，以及和 Recipe 的边界。

### 产品意义

每个 workspace 都代表一个 agent CLI 工作位。初始化钩子能减少重复准备动作，让新工作位更快进入可用状态。

## 7. Workspace View Snapshot

### 功能是什么

保存并恢复单个 workspace 的视图面板状态和布局状态。它保存的是前端视图参数，不是 Git 回滚，也不是文件内容回退。

### 当前完成进度

当前状态：前端原型完成。

已交付：DetailPanel 中的 Workspace View Snapshot 入口、保存弹窗、恢复弹窗、删除按钮、恢复预览、恢复前自动保存 Before Restore、localStorage 存储、布局 slot assignment 恢复。

当前边界：只支持 Terminal / Explorer / Diff 等前端视图面板记录；不恢复命令历史、不回滚代码、不跨 workspace restore、不做项目级 snapshot。

### 下一版本计划

下沉正式持久化层，定义缺失面板重建策略、非快照面板处理策略、恢复失败回退策略，并评估与批量控制联动。

### 产品意义

workspace 是 agent 工作现场。Workspace View Snapshot 让用户能暂存并回到某个观察布局，增强工作连续性。

## 8. 布局系统 / Layout

### 功能是什么

为 workspace 中间区域提供轻量 slot 布局能力，让面板不再只能通过单一 tab 区切换。

### 当前完成进度

当前状态：前端原型完成。

已交付：Single、Columns、Rows、Top 1 / Bottom 2、Quad Grid；slot 化 Panel 1-4；单栏隐藏 slot 标签；格子内 Select 下拉打开 panel；可拖动分割比例；keyboard focus switching；布局状态与 Workspace View Snapshot 联动。

当前边界：不是完整 tmux split tree；terminal 和 detail panel 仍保持原边界；没有新增 IPC 或数据库 schema。

### 下一版本计划

评估正式 pane tree / split tree、命名布局保存、更多布局预设、清空 slot、按类型筛选 panel、terminal/detail panel 是否纳入统一布局模型。

### 产品意义

类 tmux 产品的 workspace 不应长期停留在“单显示区 + tab 切换”。轻量布局让一个 agent 工作位更像真正的工作台。

## 9. 项目活动流 / Project Activity Stream

### 功能是什么

在 Status Panel 中提供项目级活动观察层，帮助用户看到多个 workspace / agent CLI 最近推进到了哪里。

### 当前完成进度

当前状态：前端三视图已交付。

已交付：Activity Stream Tab、Raw / Semantic / Summary 三视图、Manager Brief、Markdown / JSON 导出、点击条目进入 workspace、与当前筛选联动、localStorage 预览持久化。

当前边界：不是原始 terminal 全文流，不替代 terminal panel；Manager Brief 是前端规则生成，不是独立 agent 分析；没有新增主进程摘要总线、IPC 或数据库 schema。

### 下一版本计划

接入正式 supervisor / summary bus，替换前端心跳补位，消费 session output / conversation message 的结构化事件，并支持更细筛选与项目日报 / handoff 导出。

### 产品意义

多 Agent 项目管理需要的不只是“能打开多个终端”，还需要快速看到每个工作位刚刚做了什么、哪里需要人介入。

## 10. Workspace / Worktree 管理界面

### 功能是什么

把底层 Git worktree 机制产品化成可见、可比较、可进入的 workspace 管理界面。

### 当前完成进度

当前状态：V1 前端已交付。

已交付：workspace 总览表格、Workspace Detail、Main workspace 与普通 workspace 统一展示、Open Workspace 明确动作、新建 workspace 后刷新并聚焦。

当前边界：没有独立 worktree 管理页，没有新增数据库 schema，也没有一对多 branch/workspace 管理模型。

### 下一版本计划

与 supervisor agent、activity stream、批量控制继续联动，形成更完整的 workspace 生命周期管理。

### 产品意义

它让 Zync 从“创建多个隔离目录”升级为“管理多个 agent 工作位”。

## 11. PR 结构收敛记录

### 功能是什么

回应 PR review 中关于结构边界、命名和测试位置的要求，让原型代码不固化成难维护的生产架构。

### 当前完成进度

当前状态：结构收敛完成。

已交付：

- 正式运行模块移动到 `frontend/src/features/*`。
- 生产组件不再直接依赖 `*DemoState` 导出名。
- 前端预览持久化 key 从 demo 语义收敛为 preview 语义，并保留旧 key 读取兼容。
- `UpdateWuruize/` 只保留 Markdown 说明文档。
- `frontend/tsconfig.json` 保持只编译 `src`。
- 前端 feature 测试迁移到对应 feature 的 `__tests__` 目录。
- `QuickSwitcher`、`ProjectDashboard`、`ProjectActivityStreamCard`、`CreateSessionDialog`、`WorkspaceLayoutSurface` 已做低风险拆分，把纯模型 / presentation helper 移出。
- `ProjectActivityStreamCard` 进一步把文案生成、视图说明、导出文件名和摘要 helper 下沉到 feature presentation 模块。
- `main/src/services/__tests__/gitStatusManager.test.ts` 已按当前 `GitStatusManager` 的 fast plumbing 实现更新测试 mock，避免继续测试已不存在的旧私有 helper。

当前边界：

- localStorage 仍用于前端预览持久化，尚未下沉正式数据库。
- main 进程没有新增业务 IPC；PR 中的 main 相关变更服务于开发稳定性、现有主进程配置 / 菜单 / panel 接线兼容，以及主进程自身测试边界，不代表新增后端业务执行器。

### 下一版本计划

继续按 feature/domain 拆分大型 UI 组件，并为后端化能力单独开 PR：批量执行器、初始化钩子执行链路、正式 snapshot 存储、activity summary bus。

### 产品意义

结构收敛能让这次前端产品探索以可维护方式进入主线，避免“demo 命名 + 临时目录 + 跨包测试”变成后续架构债。

## 验证记录

已运行：

- `pnpm --filter frontend typecheck`
- `pnpm --filter frontend test`
- `pnpm typecheck`
- `pnpm lint`：通过，保留仓库既有 lint warnings。
- `pnpm --filter frontend build`
- `pnpm --filter main exec vitest run`
- `pnpm run build:main`
- `pnpm electron-dev`：Windows 开发版启动级检查通过，`backend-debug.log` 记录 `[Main] Window created successfully`，未出现主进程 JavaScript 异常；项目切换、创建会话、布局、快照 / 恢复和中英文切换仍建议在 PR review 时做人工点击确认。
