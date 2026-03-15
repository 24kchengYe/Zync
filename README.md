<p align="center">
  <img src="main/assets/zync-icon-256.png" alt="Zync" width="128" />
</p>

<h1 align="center">Zync</h1>

<p align="center">
  <strong>The IDE for AI Agents</strong> — Orchestrate Claude Code, Codex, Aider, and more in parallel.
</p>

<p align="center">
  <a href="https://github.com/24kchengYe/Zync/stargazers"><img src="https://img.shields.io/github/stars/24kchengYe/Zync?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117&color=3B82F6" alt="Stars" /></a>
  <a href="https://github.com/24kchengYe/Zync/network/members"><img src="https://img.shields.io/github/forks/24kchengYe/Zync?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117&color=1E40AF" alt="Forks" /></a>
  <a href="https://github.com/24kchengYe/Zync/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=for-the-badge&labelColor=0d1117&color=60A5FA" alt="License" /></a>
  <a href="https://github.com/24kchengYe/Zync/releases"><img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=for-the-badge&labelColor=0d1117&color=93C5FD" alt="Platform" /></a>
</p>

<p align="center">
  While VS Code and PyCharm are built for humans who write code,<br/>
  <strong>Zync is built for humans who manage AI agents that write code.</strong>
</p>

<p align="center">
  <strong>If Zync helps your workflow, please consider giving it a <a href="https://github.com/24kchengYe/Zync/stargazers">Star</a>!</strong>
</p>

## Why Zync?

Traditional IDEs give you an editor, a terminal, and a debugger — tools for *writing* code yourself. But in the age of AI coding agents, your job has changed: you're no longer the programmer, you're the **project manager** directing multiple AI agents.

Zync is the workspace for this new workflow:

- **Parallel execution** — Run 10+ AI agents simultaneously, each working on a different task
- **Automatic isolation** — Every agent gets its own git worktree (a full copy of your project), so they never conflict with each other
- **Review & merge** — Built-in diff viewer to inspect what each agent changed, then merge the best results back to your main branch
- **Any agent, any model** — Works with Claude Code, OpenAI Codex, Aider, Goose, or any CLI-based AI coding tool
- **Permission control** — Choose per workspace: let the AI run freely, or require your approval for every action
- **Diff caching** — Intelligent fingerprint-based caching for instant tab switching

## Zync vs Traditional IDEs

| | VS Code / PyCharm | Zync |
|---|---|---|
| **Who writes code** | You | AI agents |
| **Your role** | Programmer | Project manager |
| **Parallel work** | One editor at a time | 10+ agents in parallel |
| **Isolation** | Manual branching | Automatic git worktrees |
| **Code review** | External tools (GitHub) | Built-in diff viewer |
| **Agent support** | Extensions/plugins | Native, any CLI agent |

> **Note:** Zync and VS Code are complementary, not competing. Use VS Code for writing LaTeX, debugging, and plugins. Use Zync for orchestrating multiple AI agents. Zync has an "Open in IDE" button to jump into VS Code for any workspace.

## Workflow

```
┌─────────────────────────────────────────────────────────┐
│  1. Add Project    Point Zync to any git repository     │
│         ↓                                               │
│  2. Create         Each workspace gets its own branch   │
│     Workspaces     and isolated working directory       │
│         ↓                                               │
│  3. Run AI         Claude Code, Codex, Aider, or any    │
│     Agents         CLI tool runs in parallel             │
│         ↓                                               │
│  4. Review         Built-in diff viewer shows what       │
│     Changes        each agent modified                   │
│         ↓                                               │
│  5. Merge          Merge the best solution back to main  │
│         ↓                                               │
│  6. Push           Upload merged result to GitHub        │
└─────────────────────────────────────────────────────────┘
```

### Interface Layout

```
┌─────────────────────────────────────────────────────────┐
│  Z  Zync                              + Add Tool  ⚙  ▶ │
├──────────┬──────────────────────────┬───────────────────┤
│          │  Tabs:                   │                   │
│ Projects │  [Workspace] [Explorer]  │  Branch: feature  │
│          │  [Diff] [Claude CLI]     │                   │
│ ├ Task 1 │                          │  CHANGES          │
│ ├ Task 2 │   AI Agent Terminal      │  +3 -1 (2 files)  │
│ └ Task 3 │   or Diff Viewer         │                   │
│          │   or File Explorer       │  ACTIONS           │
│ + New    │                          │  Fetch | Commit   │
│          │                          │  Pull  | Push     │
│          │                          │  Rebase | Merge   │
├──────────┴──────────────────────────┤                   │
│  ▸ TERMINAL  │  Claude  │  Codex    │  HISTORY          │
└─────────────────────────────────────┴───────────────────┘
```

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22.14.0
- [pnpm](https://pnpm.io/) >= 8.0.0
- [Git](https://git-scm.com/)
- At least one AI agent installed:
  - Claude Code: `npm install -g @anthropic-ai/claude-code`
  - Codex: `npm install -g @openai/codex`
  - Aider: `pip install aider-chat`

### Install & Run

```bash
git clone https://github.com/24kchengYe/Zync.git
cd Zync
pnpm install
pnpm run setup
```

**Start (two terminals):**

```bash
# Terminal 1 — frontend
pnpm run --filter frontend dev

# Terminal 2 — app (after frontend shows "ready")
npx electron .
```

**Windows one-click launcher:**

Copy `start.bat.example` to `start.bat`, edit your settings, then double-click to launch. You can create a desktop shortcut with the Zync icon by running:

```powershell
powershell -ExecutionPolicy Bypass -File create-shortcut.ps1
```

### Build for production

```bash
pnpm run build:win:x64    # Windows
pnpm run build:mac         # macOS
pnpm run build:linux       # Linux
```

## Features

### Git Worktree Isolation

Each workspace automatically creates an isolated git worktree — a full working copy of your project on its own branch. Multiple AI agents can work simultaneously without interfering with each other. When you're done, merge the best result back to main.

### Permission Control

Choose per workspace how much freedom to give the AI:

| Mode | Behavior |
|------|----------|
| **Fast & Flexible** | AI executes all operations automatically. Best for trusted development workflows. |
| **Secure & Controlled** | AI asks for your approval before running commands or modifying files. Safer for production code. |

### Built-in Diff Viewer

Syntax-highlighted diff viewer shows exactly what each AI agent changed. Compare against the main branch, review individual commits, and decide whether to merge. Cached with fingerprint-based invalidation for instant tab switching.

### Git Operations

Full git workflow available from the right sidebar:

| Action | Description |
|--------|-------------|
| **Fetch** | Check for remote updates |
| **Commit** | Save a version snapshot |
| **Pull** | Download latest from remote |
| **Push** | Upload your changes to remote |
| **Stash / Pop** | Temporarily save / restore uncommitted changes |
| **Rebase from main** | Sync latest changes from main branch |
| **Merge to main** | Apply changes to the main branch |

### Multi-Agent Support

Run any CLI-based AI coding agent:

- **Claude Code** (Anthropic) — Native integration with statusline support
- **OpenAI Codex** — Built-in terminal preset
- **Aider** — Add via custom command
- **Goose** — Add via custom command
- Any other CLI tool

## Configuration

### Smart Workspace Naming (Optional)

Zync can use AI to auto-name workspaces based on your prompts. Configure via OpenRouter in `start.bat`:

```bat
set OPENAI_API_KEY=your-openrouter-key
set OPENAI_BASE_URL=https://openrouter.ai/api/v1
set OPENAI_MODEL=anthropic/claude-haiku-4-5
```

Compatible with any OpenRouter model (DeepSeek, GPT-4o, Claude, etc.).

### Settings

Access via gear icon or `Ctrl + ,`:

| Setting | Description |
|---------|-------------|
| **Theme** | Light / Dark / OLED |
| **UI Scale** | 0.8x to 1.5x zoom |
| **Terminal Shell** | Git Bash (recommended) / PowerShell / CMD |
| **Security Mode** | Fast & Flexible or Secure & Controlled |
| **Custom Claude Path** | Use your own Claude Code installation |
| **Notifications** | Desktop alerts when agents finish or need input |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Command palette |
| `Ctrl + N` | New workspace |
| `Ctrl + Shift + N` | New project |
| `Ctrl + ,` | Settings |
| `Ctrl + B` | Toggle sidebar |
| `Ctrl + Enter` | Send input to AI |
| `Ctrl + Shift + 1` | Open Terminal panel |
| `Ctrl + Shift + 2` | Open Explorer panel |
| `Ctrl + Shift + 3` | Open Claude CLI |
| `Ctrl + Shift + 4` | Open Codex CLI |
| `F12` | Developer tools |

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Windows** | Full support | Native permission IPC via named pipes |
| **macOS** | Full support | Universal binary (Intel + Apple Silicon) |
| **Linux** | Full support | deb and AppImage packages |

## Changelog

### v1.0.0 (2026-03-15)

**Core:**
- Windows Permission IPC server using named pipes
- Security mode (approve/ignore) works correctly across all code paths
- Permission mode selector in workspace creation dialog
- Permanent delete for archived workspaces
- Uses global Claude Code installation (statusline support)
- Claude Code manages its own sessions natively
- Diff caching with fingerprint-based invalidation

**UX:**
- Git action descriptions (Fetch, Stash, Rebase, Merge, etc.)
- "New Workspace" terminology unification
- Settings dropdowns no longer close the dialog
- DevTools toggle button in toolbar
- Chinese path support
- OpenRouter support for smart workspace naming
- Chinese user guide (GUIDE_CN.md)

**Fixes:**
- Modal overflow clipping dropdown menus
- Permission mode not passed from creation dialog to CLI
- Delete button missing from archived workspaces
- PTY terminal type corrected to xterm-256color
- Global Claude Code used instead of bundled version

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

AGPL-3.0 — See [LICENSE](LICENSE)

---

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=24kchengYe.Zync)

[![Star History Chart](https://api.star-history.com/svg?repos=24kchengYe/Zync&type=Date)](https://star-history.com/#24kchengYe/Zync&Date)
