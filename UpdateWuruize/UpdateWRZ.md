# UpdateWRZ

本文只记录相对于原始 Zync 的增量功能，不再按时间流水整理。

`UpdateWuruize` 的定位是增量来源目录：

- 放新增的前端 demo 组件、语言资源、状态 helper 和这份更新文档。
- 不要求把所有主线正式文件完整镜像一份到这里。
- 当前文档只保留已经进入开发版、并且仍然有效的功能增量。

## 1. 中文包与中英切换 / Chinese Package and Bilingual Support

### 1.1 这个功能是干什么的

- 为整个产品提供统一的中英双语切换能力。
- 让首页、项目视图、workspace 创建、状态观察、批量控制、初始化钩子、视图快照、布局系统等高频界面都能在中文和英文之间切换。
- 这不是单点翻译，而是给后续新功能提供统一的翻译键、上下文和语言入口。

### 1.2 这个功能目前完成进度、交付进度

- 当前状态：`持续推进`
- 已交付：
  - `I18nProvider` 与翻译键体系已经接入当前前端开发版。
  - 语言选择和基础偏好已经可用。
  - 项目发现与默认入口、Global Switcher、状态面板、命令广播、初始化钩子、Workspace View Snapshot、Layout 已接入双语。
  - `New Repository / 新建仓库` 弹窗（`AddProjectDialog`）已从硬编码文案切换为翻译键，覆盖标题、字段标签、提示、按钮和分支识别状态。
  - 状态面板 `Workspace Detail` 的关键残留文案已补齐中文（`概览 / Git / 活动`、`主工作区`、`打开工作区`）。
- 当前边界：
  - 中文包不是一次性完成功能，而是会随着新增功能继续补齐。
  - 当前仍允许少量历史英文残留继续被清理，但新功能默认要求先接入双语再进入开发版。

### 1.3 这个功能的下一个版本计划

- 继续清理剩余硬编码英文文案和翻译键不一致的问题。
- 把新功能开发流程固定为“先接入翻译键，再进入正式界面”。
- 后续如有必要，再把语言偏好进一步并入更稳定的正式配置链路。

### 1.4 这个功能对产品的意义

- Zync 是类 tmux 的多 Agent、多 workspace 工作台，不是单页面工具。
- 当产品进入多项目、多 workspace、多控制层的使用方式后，语言统一会直接影响理解成本和日常操作效率。
- 中文包的意义不是“把词翻出来”，而是让所有核心操作在中英文两套语境里都同样可用。

## 2. 项目发现与默认入口 / Project Discovery and Default Entry

### 2.1 这个功能是干什么的

- 解决“用户打开 Zync 后应该先去哪里”的问题。
- 目标是让用户尽快回到已有项目上下文，而不是重新找项目、找 workspace、找入口。
- 这是项目级入口组织能力，不是单个 workspace 内部操作能力。

### 2.2 这个功能目前完成进度、交付进度

- 当前状态：`前端阶段完成`
- 已交付：
  - 首页启动入口卡。
  - 默认项目、默认 workspace 的跳转预览。
  - 恢复上次项目的兜底逻辑预览。
  - 左侧 Sidebar 的项目过滤。
  - 项目上下文识别条。
  - 左侧项目悬浮卡片已补充项目删除入口，并继续复用现有确认删除链路。
  - `favorite / bookmark / recent / default project / default workspace` 相关概念已经在 demo state 中跑通。
- 当前边界：
  - 当前最终前端已经收敛为“首页启动入口卡 + 侧栏过滤 + 项目上下文条”。
  - 早期“大卡片式项目发现面板”没有继续保留为当前最终界面。
  - 当前仍是前端 demo state 和接线完成，不是主进程 / 数据库持久化完成。

### 2.3 这个功能的下一个版本计划

- 把默认项目、默认 workspace、最近项目、收藏项目等状态下沉到正式持久化链路。
- 继续评估是否需要独立的项目发现首页，而不是继续保持“入口卡 + 侧栏”的组合。
- 优化启动后回到正确上下文的默认策略。

### 2.4 这个功能对产品的意义

- 类 tmux 产品的关键，不只是在于“能开终端”，而是在于“能快速回到正确的工作现场”。
- 当一个项目下同时有多个 workspace、多个 agent CLI 时，启动入口效率会直接影响整个工作流速度。
- 这项能力决定了 Zync 打开之后更像一个开发工作台，而不是一个需要重新找入口的工具壳。

## 3. 搜索栏 / Global Switcher（产品计划名：Quick Switcher）

### 3.1 这个功能是干什么的

- 提供一个全局搜索入口，用于快速切换项目和 workspace。
- 解决的是“应用已经打开后，如何在多个上下文之间高速跳转”的问题。
- 产品计划中的名称仍然保留 `Quick Switcher`，当前前端显示名称已经改为 `Global Switcher`。

### 3.2 这个功能目前完成进度、交付进度

- 当前状态：`前端阶段完成`
- 已交付：
  - `mod / ctrl + j` 打开的全局切换器。
  - 最近、收藏、项目、workspace 的分组结构。
  - 模糊搜索。
  - 预览信息。
  - 项目跳转与 workspace 跳转。
- 当前边界：
  - 当前“最近 / 收藏”来源于 workspace history 与 favorite workspace。
  - 当前不是独立“任务”实体的索引与检索。
  - 当前不能写成“最近任务 / 收藏任务搜索已完成”。
  - 后端索引、正式持久化策略和任务对象检索尚未开始。

### 3.3 这个功能的下一个版本计划

- 如果后续引入真正的任务实体，再评估任务级搜索。
- 再决定是否需要独立的后端索引、结果排序策略和更强的召回逻辑。
- 继续优化预览质量，以及项目 / workspace 的跳转链路。

### 3.4 这个功能对产品的意义

- 在多 Agent、多 workspace 场景里，真正高频的动作通常不是“创建”，而是“切换”。
- 这项能力把跨项目、跨 workspace 的高频跳转收敛到一个入口里，减少反复通过侧栏和树层级寻找目标的成本。
- 它和“项目发现与默认入口”的区别在于：前者负责应用打开时先到哪里，后者负责应用打开后如何高速切换。

## 4. 状态面板 / Status Panel

### 4.1 这个功能是干什么的

- 提供项目级的状态观察层。
- 它的视角不是“某一个 workspace 现在怎么样”，而是“整个 project 下所有 workspace 当前是什么局面”。
- 当前采用的是“项目汇总 + 主观察区 Tab + workspace 总览表格 + workspace 详情面板”的前端结构。

### 4.2 这个功能目前完成进度、交付进度

- 当前状态：`前端阶段完成`
- 已交付：
  - 项目汇总卡：运行中、等待输入、有改动、执行失败、项目同步状态。
  - 项目同步信息展示。
  - 状态面板主观察区已收口为 `批量控制 / 流式输出` 双 Tab，而不是让两个功能直接堆叠在同一块主区域里。
  - workspace 总览表格，继续承担筛选、比较和批量选择。
  - workspace 详情面板，固定为 `Overview / Git / Activity` 三个 Tab。
  - `Main workspace` 现在纳入同一套列表与详情结构，并通过 `Main` 徽标明确标识。
  - 行点击语义已调整为“更新详情聚焦”，不再直接跳转 workspace；真正进入工作位改为显式 `Open Workspace` 动作。
  - 按全部、运行中、等待输入、有改动、失败、落后主分支等条件过滤。
  - workspace 详情聚焦规则：首次默认选中首个可见 workspace；刷新时尽量保持原聚焦；被筛掉时自动回退到筛选结果中的第一项。
  - 新建 workspace 后，状态面板会刷新并优先聚焦这次新建出来的第一个 workspace。
  - 主观察区内容现已改为独立滚动，修复此前流式输出插入后把下方 workspace 区域挤压、导致状态面板无法继续下拉的问题。
  - 主观察区内的批量结果卡与流式输出卡已取消各自独立的纵向滚动，统一跟随主观察区滚动，避免鼠标悬停在卡片上时出现“看起来无法继续下拉”的嵌套滚动问题。
  - 本轮又完成了一次状态面板紧凑化收口：顶部标题区、项目汇总卡、远端同步卡、主观察区头部、workspace 表格行、批量控制卡、流式输出卡统一下调字号、内边距和徽标尺寸，减少单屏信息浪费，让同一屏能看到更多 workspace 状态。
- 当前边界：
  - 当前前端展示的是接到真实 dashboard 数据后的状态视图，不是纯 mock 页面。
  - 但“测试通过 / 失败”等更细粒度信号还没有完成正式后端接线。
  - 当前 `Activity` 详情页签还是 workspace 级轻量摘要，不是后续计划中的三层流式输出终态。
  - 因此当前可以认定为前端阶段完成，不能认定为整条后端能力全部完成。

### 4.3 这个功能的下一个版本计划

- 接入更真实的测试信号和失败原因分类。
- 细化 workspace 状态类型，而不只是粗粒度观察。
- 评估是否增加状态历史、状态快照或趋势观察能力。

### 4.4 这个功能对产品的意义

- 类 tmux 的多 Agent 产品，不能只停留在“多个终端并排存在”。
- 用户需要先知道整个项目当前是什么局面：谁在跑、谁在等输入、谁失败了、谁有改动、项目是否落后主线。
- 状态面板让 Zync 从“管理终端”开始进入“管理多 Agent 项目现场”的层级。

## 5. 命令广播 / 批量控制 / Command Broadcast / Batch Control

### 5.1 这个功能是干什么的

- 提供对多个 workspace 的统一操作入口。
- 它挂在状态面板的主观察区中，不是独立页面。
- 目标是让用户对一个项目内的多个 agent CLI 工作位做批量控制，而不是逐个进入操作。

### 5.2 这个功能目前完成进度、交付进度

- 当前状态：`前端原型完成`
- 已交付：
  - 状态面板主观察区中的 `Batch Control / 批量控制` 主 Tab。
  - 进入批量模式后的多选 workspace 交互。
  - 按当前可见、运行中、等待输入、有改动、失败等条件快速选中。
  - 动作预览：`Stop`、`Git Status`、`Run Tests`、`Save View Snapshot`。
  - 动作确认层。
  - 最近一次批量动作结果卡。
  - 批量动作结果卡现在不再自带独立纵向滚动，滚动手势统一交给状态面板主观察区处理。
- 当前边界：
  - 当前只是前端交互原型。
  - 结果卡展示的是未来真实执行后应有的反馈形态，不是实际命令执行回执。
  - 当前没有主进程批量调度器、没有执行队列、没有真实命令下发与回传。

### 5.3 这个功能的下一个版本计划

- 增加真实的主进程批量调度器。
- 接入命令下发、执行队列、结果回传、失败重试。
- 让视图快照保存、批量停止、批量测试等动作进入正式可追踪链路。

### 5.4 这个功能对产品的意义

- 状态面板负责“看见全局”，命令广播负责“统一操作”。
- 当一个项目下跑着多个不同职责的 agent CLI 时，逐个进入执行同样的操作会非常低效。
- 这项能力把 Zync 从“多 workspace 并排可见”推进到“多 workspace 可批量编排”。

## 6. Workspace 初始化钩子 / Workspace Init Hooks

### 6.1 这个功能是干什么的

- 定义新建 workspace 时默认应该继承哪些初始化动作。
- 它的语义不是 `Recipe`，不是任务编排，而是“一个新的 agent CLI 工作位刚创建出来时，应该自动带上哪些准备动作”。
- 当前 V1 的重点是把这套语义和前端入口做出来。

### 6.2 这个功能目前完成进度、交付进度

- 当前状态：`前端原型完成`
- 已交付：
  - `Project Settings` 里的 `Workspace Init Hooks` 原型区块。
  - 三类已有项目字段与 hook 语义的映射：
    - `Build Script` -> `Setup Commands`
    - `Run Commands` -> `Startup Commands`
    - `Open IDE Command` -> `Auto-open IDE`
  - 两项前端 demo 配置：
    - `Enable by default for new workspaces`
    - `Default Panels`
  - `New Workspace` 弹窗中的 `Init Hooks` 摘要卡。
  - 本次创建级别的 `Use Project Init Hooks` 开关。
  - `New Workspace` 弹窗中的“去配置 / 编辑配置”入口，可直接打开当前项目的 `Project Settings`。
  - `Default Panels` 的真实前端可见效果。
- 当前边界：
  - 当前仍是前端原型，不是正式后端执行器。
  - 当前唯一已经有可见前端效果的 hook 是 `Default Panels`。
  - `Setup Commands / Startup Commands / Auto-open IDE` 当前主要是来源映射和摘要展示。
  - 配置保存在前端 `localStorage` demo state 中，不在正式项目持久化模型里。
  - 当前先收口在项目级统一应用，不支持 per-workspace override。

### 6.2.1 四类 Hook 的当前定义与映射

- `Setup Commands`
  - 当前来源：映射自项目设置里的 `Build Script`。
  - 当前语义：workspace 刚创建后、进入正式工作前要先跑的一次性准备命令。
  - 典型例子：`pnpm install`、`npm install`、`uv sync`、`pip install -r requirements.txt`、生成本地缓存、初始化依赖。
  - 对类 tmux 多 agent 产品的意义：让新开的 agent CLI 工作位先具备“可运行”的基础环境，而不是每次手动补装依赖。
- `Startup Commands`
  - 当前来源：映射自项目设置里的 `Run Commands`。
  - 当前语义：workspace 已经创建好以后，默认希望自动启动的运行命令。
  - 典型例子：`pnpm dev`、`npm run watch`、`pnpm test --watch`、`uv run pytest -f`、本地预览服务或 watcher。
  - 对类 tmux 多 agent 产品的意义：让某个 workspace 天生就是“跑实现”、“跑测试”或“跑观察”的工作位，而不是空终端。
- `Auto-open IDE`
  - 当前来源：映射自项目设置里的 `Open IDE Command`。
  - 当前语义：workspace 就绪后默认要不要顺手打开 IDE，以及用什么命令打开。
  - 典型例子：`code .`、`cursor .`，也可以是团队自定义 IDE 打开命令。
  - 对类 tmux 多 agent 产品的意义：把“开工作位”与“开编辑环境”连在一起，降低从工作位切回人工编辑的摩擦。
- `Default Panels`
  - 当前来源：这是 V1 新增的前端 demo 配置，不映射到旧项目字段。
  - 当前语义：新 workspace 默认打开哪些前端面板。
  - 当前范围：`Terminal / Explorer / Diff`。
  - 当前实际效果：它是 V1 里唯一已经真实参与前端创建体验的 hook；打开后，新 workspace 会按配置预置这些面板。
  - 对类 tmux 多 agent 产品的意义：把“这个工作位一打开就应该看到什么工具”固定下来，让不同 agent 工作位形成稳定的观察与操作模板。

### 6.3 这个功能的下一个版本计划

- 把项目级 hook 配置下沉到正式项目配置，而不是前端 `localStorage`。
- 在主进程里补正式初始化执行器，定义执行顺序、失败策略和去重规则。
- 让 hook 执行结果、失败原因和最近一次执行状态回到 workspace 级 UI。
- 再评估是否支持 per-workspace override。
- 继续明确它与 `Recipe` 的边界，避免把初始化钩子做成任务编排。

### 6.4 这个功能对产品的意义

- 对类 tmux 的多 Agent 产品来说，workspace 不是目录副本，而是真正的 agent 工作位。
- 初始化钩子的价值在于把“每次新建 workspace 后都要重复做的准备动作”产品化。
- 它让用户从“我新建了一个 worktree”过渡到“我已经布置好了一个新的 agent CLI 工作位”。

## 7. 工作区视图快照 / Workspace View Snapshot

### 7.1 这个功能是干什么的

- 让单个 workspace 可以保存一份当前工作区视图状态，并在之后恢复回来。
- 它解决的是“这个 agent 工作位当前的面板排列、活动面板和布局状态，我想先存下来，之后再回到这个状态”的问题。
- 当前语义是 workspace 级视图快照，不是 Git 回滚，不是文件内容回退，也不会回溯代码历史。

### 7.2 这个功能目前完成进度、交付进度

- 当前状态：`前端原型完成`
- 已交付：
  - 右侧 `DetailPanel` 中新增 `Workspace View Snapshot` 区块。
  - `Save View` 与 `Restore View` 两个入口按钮。
  - 最新一条视图快照摘要卡，以及列表内、摘要卡上的删除入口。
  - 视图快照删除入口现在已经做成更显性的文本按钮，删除前会先弹出确认提示。
  - `Save Workspace View Snapshot` 与 `Restore Workspace View Snapshot` 两个弹窗。
  - 视图快照保存到前端 `localStorage` demo state。
  - 视图快照的存储键已经从临时 `sessionId` 收敛为稳定的 workspace key，优先按 `worktreePath` 持久化。
  - 已兼容旧的 session-bound 视图快照记录；首次读到旧记录时，会自动迁移到稳定的 workspace key。
  - 恢复预览会计算当前可恢复面板、缺失面板、额外面板和保留不动的非快照面板。
  - 执行恢复前会自动生成一条 `Before Restore` 视图快照。
  - 当前恢复会在缺失的 `Terminal / Explorer / Diff` 面板被关闭后，先按快照标题重建缺失面板，再恢复顺序与活动面板。
  - 当前恢复会同步更新前端 store 与现有 panel 持久化顺序，而不只是本地临时切换。
  - 当面板 id 变化、但 `type + title` 语义保持一致时，恢复预览和恢复应用会优先做语义匹配，不再因为新 panel id 而把已有快照当成“丢失”。
  - 本轮新增了视图快照与布局系统的联动：快照现在会一起保存并恢复 `Layout Mode / Slot Assignments / Split Ratio / Focused Slot`。
- 当前边界：
  - 本轮只支持 `Terminal / Explorer / Diff` 三类面板进入视图快照。
  - 本轮没有新增主进程执行器、没有新增 IPC、没有新增数据库 schema。
  - 本轮不做 Git 状态回滚、不做文件内容回滚、不做命令历史恢复。
  - 当前删除只会移除前端 `localStorage` 中的视图快照记录，不会删除代码、文件或 Git 历史。
  - 本轮不支持跨 workspace restore，也不支持项目级 view snapshot。
  - 当前恢复的是前端视图状态，不是代码现场本身。
- 验证记录：
  - `pnpm --filter frontend typecheck`
  - `pnpm --filter frontend build`
  - `pnpm --filter main exec vitest run src/utils/__tests__/workspaceLayoutDemoState.test.ts src/utils/__tests__/workspaceSnapshotDemoState.test.ts`

### 7.3 这个功能的下一个版本计划

- 让视图快照真正下沉到正式持久化层，而不是只保存在前端 `localStorage`。
- 评估是否补充更多面板类型的视图快照支持，例如日志、状态观察等。
- 定义更正式的 restore 策略：
  - 缺失面板是否允许自动重建。
  - 非快照面板是保留、折叠还是提示处理。
  - restore 失败时如何回退。
- 评估是否把视图快照与批量控制联动，形成“对多个 workspace 保存 / 恢复视图快照”的后续能力。

### 7.4 这个功能对产品的意义

- 对类 tmux 的多 Agent 产品来说，workspace 不是一次性页面，而是会被频繁切换、暂存和回来继续工作的工作位。
- Workspace View Snapshot 把“我现在这套工作位视图想保留下来”产品化，增强工作位的连续性。
- 它让 Zync 不只是管理多个 agent CLI，还开始管理每个 agent 工作位内部的视图现场。

## 8. 布局系统 / Layout

### 8.1 这个功能是干什么的

- 让 workspace 内部不再只是“多个 panel tab + 单一主显示区”，而是开始具备轻量的空间布局能力。
- 当前版本已经从早期“主面板 + 辅助面板”语义，收敛成 `Panel 1 / Panel 2 / Panel 3 / Panel 4` 的 slot 化布局画布。
- 它解决的是：当一个 agent workspace 里同时需要看代码、看 diff、看文件树或状态面板时，用户不需要一直在 tab 之间来回切换，也不需要额外理解“主/副”角色。

### 8.2 这个功能目前完成进度、交付进度

- 当前状态：`前端原型完成`
- 已交付：
  - workspace 顶部新增 `Layout / 布局` 入口。
  - 五种布局预设：
    - `Single / 单栏`
    - `Columns / 左右分栏`
    - `Rows / 上下分栏`
    - `Top 1 / Bottom 2 / 上 1 下 2`
    - `Quad Grid / 四分格`
  - 中间工作区现在只保留布局画布，不再额外加入固定的右侧面板列表。
  - 每个格子直接对应一个 slot，当前前端文案统一为 `Panel 1 / Panel 2 / Panel 3 / Panel 4`。
  - 当布局处于 `Single / 单栏` 时，不再显示 `Panel 1` 这类 slot 标签，单栏直接回到纯内容视图。
  - 点击格子顶部的 slot 标识后，会在该格子内部弹出 panel 选择菜单，而不是继续沿用顶部或右侧的 companion 选择器。
  - `Panel 1 / Panel 2 / Panel 3 / Panel 4` 当前已经收口为只读展示标签，不再作为交互触发区。
  - panel 选择器现在只会从格子右上角的 `Select / 选择` 下拉按钮打开，并且已经改为脱离 slot 内容区的独立 portal 浮层，避免被当前面板内容遮挡。
  - 当前已对 slot 选择器做紧凑化处理：收窄菜单宽度、压缩标题区与列表项高度，并把底部新建按钮区改为更紧凑的双列按钮。
  - 可见 slot 会优先自动填入当前已有 panel，并且同一个 panel 不会在多个 slot 中重复占位。
  - 布局格子的外层 wrapper 与内部 `SlotFrame` 现在都补齐了 `h-full + overflow-hidden` 约束，修复了在 `Rows / 上下分栏`、`Top 1 / Bottom 2 / 上 1 下 2`、`Quad Grid / 四分格` 向上拖拽时，下方 panel frame 透出到上方格子的前端显示问题。
  - 布局状态按 workspace 保存到前端 `localStorage` demo state。
  - 布局状态的存储键已经从临时 `sessionId` 切换为稳定的 workspace key，优先按 `worktreePath` 持久化。
  - 已兼容旧的 session-bound 布局记录；首次命中旧记录时，会自动迁移到稳定的 workspace key。
  - 布局 slot assignment 现在会额外保存 panel semantic hint；当 panel id 变化、但 `type + title` 保持一致时，布局会优先做语义重绑，而不是直接失效。
  - 当前 `Columns / Rows / Top 1 Bottom 2` 继续支持可拖拽的布局分割比例调整，不再只依赖固定预设比例。
  - 当前 `Top 1 / Bottom 2` 与 `Quad Grid / 四分格` 已新增左右分栏比例拖拽；其中 `Quad Grid / 四分格` 现在同时支持上下比例与左右比例两条拖拽轴。
  - 当前 keyboard focus switching 已切换为 slot 语义，支持在可见格子之间切换焦点。
  - 当前焦点状态会在布局 UI 中高亮显示，并进入视图快照保存与恢复链路。
  - 视图快照已同步切换为 slot 语义，恢复时会把保存时的 slot 分配一起恢复回来。
- 当前边界：
  - 本轮只作用于 workspace view，不作用于 project view。
  - 本轮 terminal 继续保持底部 dock，不纳入中间布局模型。
  - 本轮 detail panel 继续保持右侧独立区域，不纳入中间布局模型。
  - 本轮没有新增主进程执行器、没有新增 IPC、没有新增数据库 schema。
  - 本轮不是完整 split tree，不支持任意多层嵌套布局。
  - 当前 keyboard focus 只覆盖可见 slot，不等于完整 tmux pane tree 的键盘导航。
  - `Quad Grid / 四分格` 当前先以轻量前端原型为主，还没有做更细粒度的双轴比例独立控制。
  - 布局系统本身不会修复 workspace 的路径错误、终端初始化失败或 Git 运行错误；这些仍属于底层会话/主进程链路问题。
- 验证记录：
  - `pnpm --filter frontend typecheck`
  - `pnpm --filter frontend build`
  - `pnpm --filter main exec vitest run src/utils/__tests__/workspaceLayoutDemoState.test.ts src/utils/__tests__/workspaceSnapshotDemoState.test.ts`

### 8.3 这个功能的下一个版本计划

- 评估是否引入更正式的 pane tree / split tree 结构。
- 评估是否把 terminal 和 detail panel 也纳入更统一的布局模型。
- 增加更多布局预设与命名布局保存能力。
- 继续完善 slot 内 panel 选择交互，例如是否加入“清空当前格子”与“按类型筛选”的更细操作。
- 继续完善焦点切换后的快捷操作，让布局更接近 tmux 式工作台体验。

### 8.4 这个功能对产品的意义

- 对类 tmux 的多 Agent 产品来说，workspace 不能一直停留在“单区显示 + tab 切换”的阶段。
- 轻量布局系统让一个 agent 工作位开始更像真正的工作台，而不是单窗口切页器。
- 可调比例、可切换焦点和可恢复布局状态，会明显降低“为了对照 diff / explorer / 主工作面板而来回切 tab”的操作成本。
- 这一步也是后续更完整布局系统、视图快照恢复布局和多工作位编排的前置基础。

## 9. 项目流式输出 / Project Activity Stream

### 9.1 这个功能是干什么的

- 在 `Status Panel / 状态面板` 里增加一个项目级的流式输出观察层。
- 它关注的不是单条原始终端日志，而是“每个 workspace 这个 agent CLI 最近做完了什么、当前是什么节奏、项目管理上应该先盯谁”。
- 当前入口位于状态面板主观察区中的 `Activity Stream / 流式输出` Tab，并且默认跟随状态筛选范围联动，所以它和项目汇总卡、workspace 明细表是同一个观察上下文。

### 9.2 这个功能目前完成进度、交付进度

- 当前状态：`前端三视图已交付`
- 已交付：
  - `Status Panel / 状态面板` 主观察区中新增 `Activity Stream / 流式输出` Tab，而不是把入口藏到右侧 DetailPanel。
  - 流式输出会跟随当前状态筛选范围联动；例如切到“运行中 / 失败 / 有改动”，流式输出也只显示该范围内的 workspace 活动。
  - 当前流式输出前端已经从单流列表升级为三种观察视图：
    - `Raw Stream / 原始流`：保留状态变化和心跳在内的完整项目级时间线。
    - `Semantic Stream / 语义流`：过滤掉心跳噪音，只保留摘要和关键状态变化。
    - `Summary Stream / 汇总流`：按 workspace 聚合最新进展，便于横向比较和管理判断。
  - 三种流视图的标签与说明文案已在中英文语言包中对齐，可随全局语言切换稳定展示。
  - 每条流式卡片都会展示：
    - workspace 名称
    - 当前状态
    - 分支
    - 变更 / 落后主分支标记
    - 来源类型（状态 / 摘要 / 心跳）
    - 相对时间
  - 点击流式条目可直接打开对应 workspace，形成“状态面板观察 -> 跳入工作位”的入口。
  - 顶部新增 `Manager Brief / 管理简报`，用当前可见 workspace 的失败、等待输入、改动、运行状态生成一个前端版管理摘要。
  - 新增 `Export Markdown / 导出 Markdown` 与 `Export JSON / 导出 JSON` 两个导出按钮。
  - 当前导出动作会带上正在查看的流视图类型，而不是只导出一份固定格式的单流列表。
  - 流式输出状态保存到前端 `localStorage` demo state，存储键按项目路径优先、项目 id 兜底。
  - 流式输出列表现已取消卡片内部独立纵向滚动，改为跟随状态面板主观察区统一滚动，降低嵌套滚动带来的交互误判。
  - 当前流式输出的数据来源是“真实会话状态 + 已有 session summary / statusMessage + 前端心跳补位”的组合：
    - 如果当前 session 里已经有 summary，会优先进入流式输出。
    - 如果没有结构化摘要，就先根据 workspace 状态变化生成状态条目。
    - 为了在前端阶段形成持续滚动感，当前会按项目可见 workspace 自动补一层心跳条目。
- 当前边界：
  - 当前不是原始终端全文流，不会替代 terminal panel，也不是把每条 stdout / stderr 原文直接塞进状态面板。
  - 当前没有新增主进程流式摘要总线、没有新增 IPC、没有新增数据库 schema。
  - 当前 `Manager Brief / 管理简报` 还是前端规则生成，不是独立 agent 的正式分析结果。
  - 当前 `Raw / Semantic / Summary` 的划分仍然是前端派生视图，不代表主进程已经提供三条独立的结构化流。
  - 当前心跳条目是前端基于 workspace 实时状态的节奏补位，用于模拟项目管理视角下的持续滚动感，不代表主进程已经提供正式的结构化 agent 摘要流。
- 验证记录：
  - `pnpm --filter main exec vitest run src/utils/__tests__/projectActivityStreamDemoState.test.ts`
  - `pnpm --filter main exec vitest run src/utils/__tests__/projectActivityStreamViewState.test.ts`
  - `pnpm --filter frontend typecheck`
  - `pnpm --filter frontend build`

### 9.3 这个功能的下一个版本计划

- 把当前前端派生的 `Raw / Semantic / Summary` 三视图，逐步升级成可接正式 supervisor / summary bus 的稳定产品结构。
- 把前端心跳补位逐步替换成真正来自主进程的结构化摘要流。
- 评估是否直接消费 session output / conversation message 的正式摘要事件，而不是只读 `summary / statusMessage`。
- 增加时间范围、workspace 范围和事件类型筛选，让状态面板里的观察更接近真正的调度台。
- 把 `Manager Brief / 管理简报` 升级为可接入独立 agent 分析的项目管理摘要层。
- 评估是否支持导出项目级日报、handoff 摘要，或和批量控制联动形成“看见问题 -> 直接批量操作”的闭环。

### 9.4 这个功能对产品的意义

- 对类 tmux 的多 Agent 产品来说，只有终端并排是不够的；项目负责人真正高频的需求是“快速看到每个工作位刚刚推进到了哪里”。
- 项目流式输出把“多 workspace 的当前进度摘要”从零散终端观察提升为统一的项目管理视图。
- 它让 Zync 从“能切换多个 agent CLI”继续往前走一步，开始更像一个面向多 agent 协作的项目调度台。

## 10. Workspace / Worktree 管理界面

### 10.1 这个功能是干什么的

- 统一回答“一个项目下有哪些 workspace，它们各自对应哪个 branch、路径在哪里、当前状态如何、我要打开哪一个”的问题。
- 用户可见概念当前统一使用 `Workspace`；`Worktree` 只保留在文档和实现语义里，用来说明底层 Git 隔离机制。
- 它不是独立页面，而是直接嵌入 `Status Panel / 状态面板`，和项目汇总、流式输出、批量控制放在同一个观察面里。

### 10.2 这个功能目前完成进度、交付进度

- 当前状态：`V1 前端已交付`
- 已交付：
  - `Workspace` 总览表格 + `Workspace Detail` 详情面板的内联式结构。
  - 一个 workspace 对应一个 branch 的前端表达。
  - `Main workspace` 与普通 workspace 的统一展示和对比。
  - `Overview / Git / Activity` 三个详情页签。
  - `Open Workspace` 明确动作，避免把“查看详情”和“进入工作位”混在一起。
  - 详情区页签与核心动作文案已完成中英对齐（中文显示为 `概览 / Git / 活动` 与 `打开工作区`）。
  - 新建 workspace 成功后，状态面板刷新并自动聚焦到新建项。
  - 创建弹窗中的说明文案已补充：
    - `base branch` 用来决定新 workspace 从哪里起步。
    - `workspace name` 会成为默认 branch 名来源。
    - `useWorktree = false` 明确表示 `Main workspace / Main repo` 路径，而不是普通隔离 workspace。
- 当前边界：
  - 当前仍然没有独立的 worktree 管理页。
  - 当前没有新增数据库 schema，也没有单独的 worktree 后端模块。
  - 当前仍沿用已有创建模型：
    - 一个 workspace 对应一个 branch。
    - 多个 workspace 可以共享同一个 `baseBranch`。
    - 不支持一个活动 branch 对应多个 workspace。

### 10.3 它和其他模块的关系

- 它和 `Status Panel` 的关系：
  - `Status Panel` 负责项目级总览。
  - `Workspace / Worktree 管理界面` 负责把“项目级总览”下钻到单个 workspace。
- 它和 `Create Workspace` 的关系：
  - 创建入口负责生成新的 workspace。
  - 管理界面负责让用户立刻看见新建结果，并进入对应工作位。
- 它和后续 `Supervisor Agent` 的关系：
  - supervisor 后续要分发、监督和仲裁多个 workspace。
  - 没有这套 workspace 总览与详情界面，supervisor 的观察对象就没有稳定落点。
- 它和后续 `3-stream` 流式输出升级的关系：
  - 当前详情里的 `Activity` 先只做 workspace 级轻量摘要。
  - 原始流 / 语义流 / 汇总流的三分视图，属于后续 supervisor 与流式输出升级阶段，不在本轮交付范围里。

### 10.4 这个功能对产品的意义

- 对 AI 产品经理 / agent 产品经理语境来说，这一层相当于把底层 Git worktree 机制真正产品化成“可管理的 agent 工作位”。
- 它让 Zync 不只是“能创建多个隔离目录”，而是开始具备“看见、比较、进入、检查多个 agent 工作位”的统一管理入口。
- 这也是后续 supervisor agent、流式输出升级、批量调度和 workspace 生命周期治理的前置基础。
