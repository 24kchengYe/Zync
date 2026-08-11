# UpdateByWuruize

这是一份给 PR 使用的简版说明。完整增量记录见 `UpdateWRZ.md`。

## 一句话概括

本次更新把 Zync 的前端体验推进为更完整的“类 tmux 多 Agent 工作台”：更快进入项目、更快切换 workspace、更清楚观察项目状态，并补充批量控制预览、初始化钩子、Workspace View Snapshot、轻量布局和项目活动流。当前仍然坚持前端优先，未把后端持久化、批量执行器或新的 IPC 协议提前合入。

## 已完成的功能模块

- 中文包与中英文切换：新增并持续补齐双语文案，覆盖新入口、状态面板、批量控制、初始化钩子、快照、布局和活动流。
- 项目发现与默认入口：提供首页启动入口卡、Sidebar 项目筛选、项目上下文条，以及默认项目 / 默认 workspace 的前端状态。
- Global Switcher：产品计划名仍是 Quick Switcher，前端显示为 Global Switcher，支持项目 / workspace 分组搜索、预览和跳转。
- 状态面板：以项目汇总 + workspace 明细的方式观察运行中 Agent、等待输入、改动、失败、同步状态和 workspace 详情。
- 命令广播 / 批量控制：位于状态面板内，当前仅做选择目标和动作预览；没有后端执行链路的按钮保持禁用并标记 Preview。
- Workspace 初始化钩子：在 Project Settings 配置，在 New Workspace 弹窗展示摘要；当前 Default Panels 有可见前端效果，其余命令类 hook 仍是来源映射和摘要。
- Workspace View Snapshot：保存 / 恢复单个 workspace 的视图面板状态和布局状态；不回滚代码、不回滚 Git、不恢复文件内容。
- Layout：提供 slot 化轻量布局画布，支持单栏、左右、上下、上 1 下 2、四分布局，以及可拖动比例和 slot focus。
- Project Activity Stream：状态面板内的项目级活动流，支持 Raw / Semantic / Summary 三种前端派生视图和 Markdown / JSON 导出。

## 结构收敛

- 正式运行依赖的 TypeScript / React 模块已放入 `frontend/src/features/*` 或对应 `frontend/src/components/*` 目录。
- `UpdateWuruize/` 只保留说明文档，不再存放正式运行依赖的前端源码。
- 原先的 `*DemoState` 导出命名已收敛为 feature/domain 命名，例如 `workspaceLayoutState`、`workspaceSnapshotState`、`projectInitHooksState`。
- 仍属于前端预览持久化的能力继续使用 localStorage；storage key 已从 demo 语义收敛为 preview 语义，并保留旧 key 读取兼容。
- 跨包测试已从 `main/src/utils/__tests__` 迁移到对应前端 feature 的 `__tests__` 目录。
- 大组件已做低风险拆分：Quick Switcher、Project Dashboard、Activity Stream、Create Session Dialog、Workspace Layout 的纯模型 / presentation helper 已移出主组件。

## 后端 / IPC 边界

- 本次 PR 不新增后端业务执行器。
- 本次 PR 不新增 IPC 请求字段。
- 本次 PR 不新增数据库 schema。
- 批量停止、Git Status、运行测试、保存快照等批量动作当前不执行真实操作，也不会显示虚假的 queued / success。
- main 包侧当前只保留开发稳定性、现有主进程配置 / 菜单 / panel 接线兼容和主进程自身测试相关内容；前端 feature 测试不再挂在 main 包下。
- `main/src/services/__tests__/gitStatusManager.test.ts` 已更新为测试当前 fast plumbing 实现，不再测试已不存在的旧私有 helper。

## 合并方式建议

- 作为前端产品体验增量合入，后续再拆后端持久化、批量执行器、正式 snapshot 存储和 supervisor/activity bus。
- 如果维护者希望继续压缩 PR，可以优先保留 `frontend/src/features/*`、状态面板、布局和快照相关文件，把纯文档或后续计划文档放到后续 PR。

## 验证命令

- `pnpm --filter frontend typecheck`
- `pnpm --filter frontend test`
- `pnpm typecheck`
- `pnpm lint`，通过但保留仓库既有 warnings
- `pnpm --filter frontend build`
- `pnpm --filter main exec vitest run`
- `pnpm run build:main`
- `pnpm electron-dev`，Windows 开发版启动级检查通过，日志显示窗口创建成功；完整 UI 点击流建议由 reviewer 人工确认
