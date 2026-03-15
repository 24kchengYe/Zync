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

Copy `start.bat.example` to `start.bat`, edit your settings, then double-click to launch.

### Build for production

```bash
pnpm run build:win:x64    # Windows
pnpm run build:mac         # macOS
pnpm run build:linux       # Linux
```

## How It Works

```
┌─────────────────────────────────────────────────────┐
│                      Zync                           │
├──────────┬──────────────────────────┬───────────────┤
│          │  Tabs: Explorer│Diff│CLI │               │
│ Projects │                          │  Git Actions  │
│          │   AI Agent Terminal      │  Pull / Push  │
│ ├ Task 1 │   (Claude Code, etc.)    │  Merge / etc  │
│ ├ Task 2 │                          │               │
│ └ Task 3 │   Each task runs in an   │  History      │
│          │   isolated git worktree  │  (commits)    │
│ + New    │                          │               │
├──────────┴──────────────────────────┴───────────────┤
│  Terminal  │  Claude  │  Codex                      │
└─────────────────────────────────────────────────────┘
```

1. **Add a project** — Point Zync to any git repository
2. **Create workspaces** — Each workspace gets its own branch and working directory
3. **Run AI agents** — Claude Code, Codex, or any CLI tool runs in isolation
4. **Review & merge** — Inspect diffs, then merge the best solution back to main

## Zync vs Traditional IDEs

| | VS Code / PyCharm | Zync |
|---|---|---|
| **Who writes code** | You | AI agents |
| **Your role** | Programmer | Project manager |
| **Parallel work** | One editor at a time | 10+ agents in parallel |
| **Isolation** | Manual branching | Automatic git worktrees |
| **Code review** | External tools (GitHub) | Built-in diff viewer |
| **Agent support** | Extensions/plugins | Native, any CLI agent |

## Configuration

### Smart Workspace Naming (Optional)

Zync can use AI to auto-name workspaces. Set in `start.bat`:

```bat
set OPENAI_API_KEY=your-openrouter-key
set OPENAI_BASE_URL=https://openrouter.ai/api/v1
set OPENAI_MODEL=anthropic/claude-haiku-4-5
```

Compatible with any OpenRouter model.

### Settings

Access via gear icon or `Ctrl + ,`:

| Setting | Description |
|---------|-------------|
| **Theme** | Light / Dark / OLED |
| **Terminal Shell** | Git Bash (recommended) / PowerShell / CMD |
| **Security Mode** | Fast & Flexible (auto-approve) or Secure & Controlled (manual approval) |
| **Custom Claude Path** | Use your own Claude Code installation |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Command palette |
| `Ctrl + N` | New workspace |
| `Ctrl + Shift + N` | New project |
| `Ctrl + ,` | Settings |
| `Ctrl + B` | Toggle sidebar |
| `Ctrl + Enter` | Send input to AI |
| `F12` | Developer tools |

## Platform Support

- **Windows** — Full support with native permission IPC (named pipes)
- **macOS** — Full support
- **Linux** — Full support (deb, AppImage)

## Changelog

### v1.0.0 (2026-03-15)

**Core Improvements:**
- Rebranded as Zync with new logo and identity
- Windows Permission IPC server using named pipes (Unix sockets don't work on Windows)
- Security mode (approve/ignore) now works correctly across all code paths
- Permission mode selector added to workspace creation dialog
- Permanent delete for archived workspaces
- Uses global Claude Code installation instead of bundled version (statusline support)
- Removed session ID injection — Claude Code manages its own sessions natively

**UX Enhancements:**
- Git action descriptions added (Fetch, Stash, Rebase, Merge, etc.)
- "New Pane" → "New Workspace" terminology unification
- Settings dropdown no longer closes the dialog when selecting options
- DevTools toggle button in toolbar (bug icon) instead of auto-opening
- Chinese path support (git core.quotepath=false, LANG=zh_CN.UTF-8)
- OpenRouter support for smart workspace naming
- Comprehensive Chinese user guide (GUIDE_CN.md)

**Bug Fixes:**
- Modal overflow-hidden clipping dropdown menus
- Permission mode not being passed from creation dialog to Claude CLI
- Delete button missing from archived workspaces
- PTY terminal type corrected from xterm-color to xterm-256color
- node_modules/.bin removed from terminal PATH to prevent using wrong Claude version

## License

AGPL-3.0 — See [LICENSE](LICENSE)

---

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=24kchengYe.Zync)

[![Star History Chart](https://api.star-history.com/svg?repos=24kchengYe/Zync&type=Date)](https://star-history.com/#24kchengYe/Zync&Date)
