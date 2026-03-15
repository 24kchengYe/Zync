# Zync 使用指南（非程序员友好版）

## 什么是 Zync？

Zync 是一个桌面应用，让你**同时管理多个 AI 编码助手**（Claude Code、Codex、Aider 等）。

**通俗理解：** 想象你是一个项目经理，手下有多个 AI 程序员。Zync 就是你的"指挥中心"——你给每个 AI 分配任务，它们各自在独立的空间里干活，互不影响。你随时查看每个 AI 的进度和改动，满意了就把成果合并。

---

## 如何启动 Zync（从源码）

### 首次安装

```powershell
cd D:\pythonPycharms\Zync
pnpm install          # 安装依赖
pnpm run setup        # 编译项目
```

### 每次启动（需要两个终端窗口）

**终端 1 — 启动前端服务：**
```powershell
cd D:\pythonPycharms\Zync
pnpm run --filter frontend dev
```
等看到 `ready in xxx ms` 后，再开终端 2。

**终端 2 — 启动桌面应用：**
```powershell
cd D:\pythonPycharms\Zync
npx electron .
```

Zync 窗口会自动弹出。两个终端都不能关，关了应用就停了。

### 一键启动（推荐）

双击桌面上的 **Zync** 快捷方式，或者双击 `D:\pythonPycharms\Zync\start.bat`。
自动完成上面两步，不用手动开两个终端。

### 关闭 Zync

直接关 Zync 窗口。如果用的是手动启动，在两个终端里各按 `Ctrl+C` 停止进程。

---

## 术语表（非程序员版）

开始使用前，先理解几个关键词：

| 术语 | 通俗解释 |
|------|----------|
| **Repository（仓库）** | 你的项目文件夹。就像一个装满文件的文件夹 |
| **Workspace（工作区）** | 在项目里给 AI 派的一个具体任务 |
| **Worktree（工作树）** | AI 工作时自动复制一份项目副本，在副本上改，不动你的原始文件。就像"另存为"一份文档来修改 |
| **Branch（分支）** | 项目的一个平行版本。就像论文的"修改稿v2"、"修改稿v3" |
| **Main（主分支）** | 项目的"正式版"，所有最终成果都合并到这里 |
| **Commit（提交）** | 保存一个版本快照。就像游戏里的"存档" |
| **Diff（差异）** | 对比两个版本的区别——红色是删掉的，绿色是新增的。就像 Word 的"修订模式" |
| **Merge（合并）** | 把 AI 的修改结果合并回正式版 |
| **Rebase（变基）** | 把正式版的最新更新同步到 AI 的工作副本 |
| **Squash（压缩）** | 把多次"存档"合并成一次，让历史更干净 |
| **Workspace** | 一个 AI 工作任务 |
| **Panel（面板）** | 任务内的标签页，比如终端、文件浏览器、差异查看器 |
| **Terminal（终端）** | 命令行窗口，AI 在这里执行操作 |
| **Explorer（浏览器）** | 文件管理器，可以浏览和编辑项目里的文件 |

---

## 界面布局

```
┌─────────────────────────────────────────────────────┐
│  菜单栏：File / Edit / View / Window / Help         │
├──────────┬──────────────────────────┬───────────────┤
│          │  标签页区域               │               │
│  左侧栏   │  ┌──────┬──────┬──────┐ │   右侧栏      │
│          │  │pane名 │Explorer│Diff │Terminal│ │               │
│ Home     │  └──────┴──────┴──────┘ │  状态：unknown │
│ 项目名   │                          │               │
│  ├ 任务1  │    主工作区              │  ACTIONS      │
│  ├ 任务2  │   （终端/文件/差异）      │  Pull / Push  │
│  └ 任务3  │                          │               │
│          │                          │  HISTORY      │
│ +新工作区 │                          │  提交记录      │
│ 新仓库   │                          │               │
├──────────┴──────────────────────────┴───────────────┤
│  底部状态栏                                          │
└─────────────────────────────────────────────────────┘
```

### 左侧栏
- **Home** — 回到主页
- **项目名** — 当前打开的项目（你的代码文件夹）
- **任务列表** — 你给 AI 派的所有任务
- **+ New workspace** — 给 AI 派一个新任务
- **New repository** — 打开/新建另一个项目

### 顶部标签页
- **pane名** — 任务概览和状态
- **Explorer** — 文件管理器，浏览/编辑项目文件
- **Diff** — 查看 AI 改了哪些代码（红删绿增）
- **Terminal** — 命令行窗口，AI 在这里干活

### 右侧栏
- **状态** — 当前任务的运行状态
- **Actions** — Git 操作按钮（Pull/Push/Merge 等）
- **History** — 提交（存档）记录

---

## 使用流程

### 第一步：创建或选择项目

点左侧栏的 **New repository**，选择你电脑上的一个文件夹：
- 如果已经是 git 仓库 → 直接打开
- 如果是普通文件夹 → Zync 自动初始化为 git 仓库

### 第二步：创建工作区（给 AI 派任务）

点 **+ New workspace**，弹出对话框：

| 字段 | 说明 | 建议 |
|------|------|------|
| **Base Branch** | 基于哪个版本开始工作 | 保持 `main` 不用改 |
| **Pane Name** | 给任务起个名字 | 改成容易辨认的，如"添加搜索功能" |

点 **Advanced** 展开更多选项（可以不改，直接用默认）：

| 选项 | 通俗解释 | 建议 |
|------|----------|------|
| **Use worktree** | AI 在独立副本里工作（开）还是直接改你的文件（关） | 保持开启 |
| **Panes: 1** | 同时派几个 AI 做这件事 | 默认 1 个就行 |
| **Checkpoint Mode** | 自动存档——AI 每做一步就保存 | 推荐，选这个 |
| **Structured Mode** | AI 自己决定何时存档并写说明 | 正式项目用这个 |
| **Disabled Mode** | 不自动存档 | 不推荐新手用 |

点 **Create** 开始。

### 第三步：AI 开始工作

创建后会自动打开终端标签页，AI（Claude Code）在里面运行。你可以：
- **看着它干活** — 终端里会显示 AI 的思考和操作
- **切到 Diff 标签** — 随时查看 AI 改了什么
- **切到 Explorer 标签** — 浏览项目文件

### 第四步：审查和合并

AI 干完后：
1. 点 **Diff** 标签查看所有改动
2. 满意 → 在右侧栏点 **Merge to main**（合并到正式版）
3. 不满意 → 在终端里继续跟 AI 对话，让它修改

---

## 顶部「+ Add Tool」菜单

点右上角的 **+ Add Tool** 可以在当前任务里添加更多工具面板：

| 选项 | 说明 |
|------|------|
| **Terminal** | 普通命令行，你自己敲命令 |
| **Explorer** | 文件浏览器 |
| **Terminal (Claude)** | 启动一个 Claude Code AI |
| **Terminal (Codex)** | 启动一个 Codex AI（OpenAI 的，需要另外配置） |
| **Add Custom Command** | 自定义启动其他工具 |

你可以在同一个任务里同时开 Claude 和普通终端——一个让 AI 写代码，一个你自己跑测试。

---

## 设置详解

按 **Ctrl + ,** 打开设置（或点左上角齿轮图标）。

### General（通用）

| 设置 | 说明 |
|------|------|
| **Theme** | 主题：Light（浅色）/ Dark（深色）/ OLED（纯黑） |
| **UI Scale** | 界面缩放：0.8x ~ 1.5x，字太小就调大 |
| **Terminal Shell** | AI 用什么命令行（见下方"终端类型区别"） |
| **Additional PATH** | 额外的程序路径，一般不用改 |
| **Verbose Logging** | 开启详细日志，排错时用 |

#### Terminal Shell 四种选项区别

| 选项 | 说明 | 推荐度 |
|------|------|--------|
| **Auto-detect (Git Bash preferred)** | 自动选择，优先用 Git Bash | 推荐 |
| **Git Bash** | 模拟 Linux 环境的命令行。AI 生成的命令（`rm -rf`、`cat`、`grep` 等）都能直接跑，兼容性最好 | 推荐 |
| **Windows PowerShell** | 微软的高级命令行。功能强但语法和 Linux 不同，AI 的某些命令会报错（比如 `rm -rf` 不能用） | 一般 |
| **Command Prompt (cmd)** | 最老的 Windows 命令行，功能最少，不支持很多现代命令 | 不推荐 |

**建议选 Git Bash 或 Auto。** 如果你习惯 PowerShell 也能用，但偶尔需要手动调整 AI 生成的命令。

### AI Integration（AI 集成）

| 设置 | 说明 |
|------|------|
| **Smart Pane Names** | 让 AI 自动给任务起名字 |
| **Default Permission Mode** | 权限模式默认值（见下方详解） |
| **API Key** | Anthropic API 密钥（用 Max 订阅不需要填） |
| **System Prompt** | 全局提示词，每次 AI 启动都会读到 |

### Notifications（通知）

| 设置 | 说明 |
|------|------|
| **启用通知** | 总开关 |
| **播放声音** | AI 完成/出错时响一下 |
| **状态变化** | AI 开始/停止时通知 |
| **需要输入** | AI 在等你回复时通知（很有用！） |
| **任务完成** | AI 做完了通知你 |

### Shortcuts（快捷文本）

自定义热键 → 自动在终端输入一段文本。比如设置 `Ctrl+Alt+D` 自动输入 `npm run dev`，省得每次手打。

### Analytics（数据分析）

使用数据上报，默认关闭，不用管。

---

## 权限模式详解

控制 AI 执行操作时是否需要你的批准：

| 模式 | 行为 | 适合场景 |
|------|------|----------|
| **Ignore（跳过）** | AI 自动执行所有操作，不问你 | 日常开发、信任 AI 时 |
| **Approve（审批）** | AI 每次要改文件/执行命令时弹窗问你 | 敏感项目、想仔细审查时 |

**在哪里改：**
1. **全局默认**：设置 → AI Integration → Default Permission Mode
2. **单个任务**：创建 Workspace 时 → Advanced → 权限选择
3. **配置文件**：直接编辑 `C:\Users\你的用户名\.pane\config.json` 里的 `"defaultPermissionMode"`

---

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + K` | 打开命令面板（搜索所有功能） |
| `Ctrl + N` | 新建 Workspace（给 AI 派新任务） |
| `Ctrl + Shift + N` | 新建项目 |
| `Ctrl + ,` | 打开设置 |
| `Ctrl + B` | 显示/隐藏左侧栏 |
| `Ctrl + Enter` | 在终端里发送消息给 AI |
| `Ctrl + Shift + 1` | 打开终端面板 |
| `Ctrl + Shift + 2` | 打开 Explorer 面板 |
| `Ctrl + Shift + 3` | 打开 Claude 终端 |
| `Ctrl + Shift + 4` | 打开 Codex 终端 |

---

## 右键菜单

在左侧栏的任务名上**右键**，可以：

| 操作 | 说明 |
|------|------|
| **Rename** | 重命名任务 |
| **Archive** | 归档（隐藏但不删除，可以恢复） |
| **Delete** | 永久删除（不可恢复） |
| **Merge to main** | 把改动合并到正式版 |
| **View git details** | 查看详细的 Git 信息 |

---

## 右侧栏操作按钮

| 按钮 | 通俗解释 |
|------|----------|
| **Pull** | 从网上（GitHub）拉取最新代码 |
| **Push** | 把代码推送到网上（GitHub） |
| **Fetch** | 检查网上有没有更新（只看不下载） |
| **Commit** | 手动保存一个版本（存档） |
| **Rebase from main** | 把正式版的最新内容同步到当前任务 |
| **Squash and rebase** | 把多次存档合成一次，然后同步正式版 |
| **Merge to main** | 把当前任务的改动合并到正式版 |

---

## 实用技巧

1. **对比方案**：创建时把 Panes 数量设为 3，让 3 个 AI 用不同方式做同一件事，选最好的
2. **先看 Diff 再合并**：永远先检查 AI 改了什么，确认没问题再 Merge
3. **用 Archive 代替 Delete**：归档可以恢复，删除不可逆
4. **通知很有用**：开启"需要输入"通知，AI 等你回复时会提醒，你就可以去做别的事
5. **Terminal Shell 选 Git Bash**：AI 生成的命令在 Git Bash 下兼容性最好

---

## 文件位置

| 内容 | 路径 |
|------|------|
| Zync 源码 | `D:\pythonPycharms\Zync\` |
| Zync 配置文件 | `C:\Users\你的用户名\.pane\config.json` |
| Zync 数据库 | `C:\Users\你的用户名\.pane\pane.db` |
| Zync 日志 | `C:\Users\你的用户名\.pane\logs\` |
| 项目的 Worktree | 各项目 `.git\worktrees\` 目录下 |

---

## 常见问题

**Q: Zync 和直接用 Claude Code 有什么区别？**
A: Claude Code 是一个 AI 助手。Zync 是管理多个 AI 助手的调度台。就像一个程序员 vs 一个管理多个程序员的项目经理工具。

**Q: 支持哪些 AI？**
A: 任何命令行 AI 工具都行：Claude Code、Codex、Aider、Goose 等。

**Q: 需要付费吗？**
A: Zync 本身免费开源。但你用的 AI（比如 Claude Code）需要有对应的订阅（比如 Claude Max）。

**Q: 用 Zync 会违反 Claude 的使用条款吗？**
A: 不会。Zync 使用的是 Anthropic 官方发布的 `@anthropic-ai/claude-code` npm 包，和你在终端直接用 `claude` 命令是一样的。

**Q: Worktree 会占很多磁盘吗？**
A: 不会。Worktree 和主项目共享大部分数据，只有正在编辑的文件是独立的。删除任务时自动清理。

**Q: 权限模式怎么选？**
A: 日常用 `Ignore`（自动批准，效率高）。重要项目用 `Approve`（每步确认，更安全）。

**Q: Terminal Shell 选哪个？**
A: 推荐 **Git Bash**。AI 生成的命令基本都是 Linux 风格的，Git Bash 能直接跑。PowerShell 偶尔会有兼容问题（比如 `rm -rf` 在 PowerShell 不能用）。

**Q: 启动时 Terminal 面板报错 "Panel Error"？**
A: 确保前端服务（`pnpm run --filter frontend dev`）还在运行。如果关掉了就重新启动。

**Q: 如何彻底关闭 Zync？**
A: 关掉 Zync 窗口 → 在两个终端里各按 `Ctrl+C`。
