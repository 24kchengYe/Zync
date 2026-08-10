# UpdateByWuruize

这是一份给 PR 使用的简版说明。  
`UpdateWRZ.md` 继续保留完整增量流水和详细记录；这个文件只负责让别人快速看懂：
- 改了什么
- 它和现有模块怎么合并
- 这次没有做什么

## 一句话概括

这次更新把 Zync 的前端体验往“类 tmux 的多 Agent 工作台”方向推了一大步：入口更快、切换更快、状态更密、初始化更顺、快照和布局开始成形，但仍然保持前端优先，不把后端持久化和执行链路提前拉进来。

## 改动模块包

- `frontend/src/components/*`
- `frontend/src/components/dashboard/*`
- `frontend/src/components/panels/*`
- `frontend/src/hooks/*`
- `frontend/src/stores/*`
- `frontend/src/types/*`
- `frontend/src/utils/*`
- `main/src/*`
- `main/src/utils/__tests__/*`
- `scripts/start-electron-dev.js`
- `UpdateWuruize/*`
- `docs/resume-project-packaging-cn.md`

## 功能说明

### 1. 中文包与中英切换

- 这是什么：给整个产品提供统一的中英文切换入口，让核心操作、设置页、状态页和创建弹窗都能双语显示。
- 怎么合并：它不是单独的新页面，而是贯穿现有导航、设置和各个工作流组件的文案层。
- 这次的意义：后续新功能可以直接接入同一套双语体系，不再各自硬编码英文。

### 2. 项目发现与默认入口

- 这是什么：解决“打开 Zync 后先去哪里”的问题，让用户尽快回到已有项目上下文。
- 怎么合并：它和首页、侧边栏、项目选择器、默认项目/默认 workspace 逻辑合并，不是独立的孤立入口页。
- 这次的意义：缩短启动后找项目、找 workspace 的时间。

### 3. Global Switcher

- 这是什么：全局搜索/跳转入口，用来快速切换项目和 workspace。
- 怎么合并：产品计划名仍然是 `Quick Switcher`，但当前前端文案改成了 `Global Switcher`；它复用了历史 workspace 和收藏 workspace 的结果，而不是独立任务索引。
- 这次的意义：把高频切换收敛到一个统一入口。

### 4. 状态面板

- 这是什么：项目级观察层，集中展示运行中的 Agent、workspace 状态、改动、失败、等待输入和同步情况。
- 怎么合并：它和 `ProjectDashboard`、`DetailPanel`、`Batch Control`、`Project Activity Stream` 是同一个 dashboard 里的不同观察区，不是分散的多个页面。
- 这次的意义：让 Zync 更像一个开发驾驶舱，而不是只看终端列表的壳子。

### 5. 命令广播 / 批量控制

- 这是什么：给多个 workspace 提供统一操作入口。
- 怎么合并：它挂在状态面板里，和观察能力配套，不单独占一个独立主页面；当前动作按钮只做 Preview，不执行真实后端命令。
- 这次的意义：在多 Agent 并行场景里，减少逐个 workspace 重复操作。

### 6. Workspace 初始化钩子

- 这是什么：新建 workspace 时默认带上的初始化动作和默认打开面板。
- 怎么合并：V1 复用现有项目字段映射，不新造后端执行系统。
- 当前映射关系：
  - `Build Script` -> `Setup Commands`
  - `Run Commands` -> `Startup Commands`
  - `Open IDE Command` -> `Auto-open IDE`
  - `Default Panels` -> V1 新增的前端 demo 配置
- 这次的意义：把“新建工作位后要做什么”前置成可见配置。

### 7. Workspace View Snapshot

- 这是什么：保存并恢复单个 workspace 的工作面板视图状态。
- 怎么合并：它和现有 panel 系统一起工作，但目前只保存前端 view state 和布局状态，不回滚代码、不回滚 Git。
- 这次的意义：让 workspace 从“临时页面”变成“可暂存、可恢复的工作现场”。

### 8. 布局系统

- 这是什么：给 workspace 中间区域提供轻量的 slot 布局能力。
- 怎么合并：当前是 slot 化的轻量版，不是完整 split tree；它和 terminal、detail panel 还保持边界。
- 这次的意义：让一个 workspace 能更像真正的工作台，而不只是 tab 切换器。

## 合并边界

- 这次没有把 workspace grouping、Control Center、Recipe、多仓库 workspace、只读共享/观战模式拉进来。
- `Snapshot / Restore` 当前只做 workspace view 级别，不是代码回滚。
- `Init Hooks` 当前是前端原型和摘要层，不是正式后端执行器。
- `Layout` 当前是轻量版，不是完整 tmux pane tree。

## 验证

- `pnpm typecheck`
- `pnpm --filter frontend build`
- `pnpm --filter main exec vitest run src/utils/__tests__/workspaceLayoutDemoState.test.ts src/utils/__tests__/workspaceSnapshotDemoState.test.ts src/utils/__tests__/projectActivityStreamDemoState.test.ts src/utils/__tests__/projectActivityStreamViewState.test.ts src/utils/__tests__/workspaceDashboardDetailState.test.ts src/utils/__tests__/workspaceLayoutSurfaceClasses.test.ts src/utils/__tests__/streamErrorGuards.test.ts`

## 给 PR 的简短介绍

这次 PR 主要把 Zync 的前端工作台体验收口成一个更完整的多 Agent 工作面：入口、切换、状态、批量控制、初始化钩子、快照和轻量布局都已经接上，但后端持久化和执行链路仍保持不动，方便下一阶段继续推进。
