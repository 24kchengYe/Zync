<p align="center">
  <img src="main/assets/zync-icon-256.png" alt="Zync" width="128" />
</p>

<h1 align="center">Zync</h1>

<p align="center">
  <strong>The IDE for AI Agents</strong><br/>
  Run multiple Claude Code, Codex, or Aider sessions in parallel — each in its own isolated git worktree.
</p>

<p align="center">
  <a href="https://github.com/24kchengYe/Zync/releases"><img src="https://img.shields.io/github/v/release/24kchengYe/Zync?style=flat-square&labelColor=0d1117&color=3B82F6" alt="Release" /></a>
  <a href="https://github.com/24kchengYe/Zync/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square&labelColor=0d1117&color=60A5FA" alt="License" /></a>
  <a href="https://github.com/24kchengYe/Zync/stargazers"><img src="https://img.shields.io/github/stars/24kchengYe/Zync?style=flat-square&logo=github&logoColor=white&labelColor=0d1117&color=3B82F6" alt="Stars" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square&labelColor=0d1117&color=93C5FD" alt="Platform" />
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> · <a href="#features">Features</a> · <a href="GUIDE_CN.md">中文指南</a> · <a href="#contributing">Contributing</a>
</p>

---

<p align="center">
  <img src="screenshots/screenshot-run.png" alt="Zync — Claude Code running in parallel sessions" width="800" />
</p>

<p align="center">
  <em>Three Claude Code agents working on different tasks simultaneously, each in its own worktree.</em>
</p>

<p align="center">
  <img src="screenshots/screenshot-diff.png" alt="Built-in diff viewer" width="800" />
</p>

<p align="center">
  <em>Review what each agent changed before merging back to main.</em>
</p>

## Why Zync?

You open a terminal, start Claude Code, give it a task, and... wait. You want to try a different approach at the same time? Now you need a second terminal, a second branch, and the discipline to keep them from editing the same files. By the third agent, you're drowning in tabs and merge conflicts.

**Zync fixes this.** Every session gets its own git worktree automatically. You see all your agents in one sidebar — who's running, who's done, who needs input. When an agent finishes, you review the diff and merge with one click. No manual branching. No conflicts. No alt-tabbing.

<table>
<tr>
<td width="50%">

**Without Zync**
- One agent at a time, or messy conflicts
- Manual `git worktree add` / cleanup
- Alt-tabbing between terminals
- Running `git diff` by hand to review changes
- No idea which agent needs your attention

</td>
<td width="50%">

**With Zync**
- 10+ agents working in parallel
- Automatic worktree isolation per session
- Single dashboard for all agents
- Built-in syntax-highlighted diff viewer
- Notifications when agents finish or need input

</td>
</tr>
</table>

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22.14.0, [pnpm](https://pnpm.io/) >= 8, [Git](https://git-scm.com/)
- At least one AI agent: [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Codex](https://github.com/openai/codex), or [Aider](https://aider.chat/)

### Install & Launch

```bash
git clone https://github.com/24kchengYe/Zync.git
cd Zync
pnpm install && pnpm run setup
```

**Option A — One-click (Windows):**

Copy `start.bat.example` to `start.bat`, edit your settings, double-click to launch.

**Option B — Manual (all platforms):**

```bash
# Terminal 1: start frontend
pnpm run --filter frontend dev

# Terminal 2: start app (after frontend shows "ready")
npx electron .
```

### Build Installers

```bash
pnpm run build:win:x64    # Windows
pnpm run build:mac         # macOS (universal)
pnpm run build:linux       # Linux (deb + AppImage)
```

## Features

<table>
<tr>
<td width="50%" valign="top">

### Parallel Agent Sessions
Run Claude Code, Codex, Aider, Goose, or any CLI tool — multiple instances at once. Each gets its own git worktree so agents never conflict.

</td>
<td width="50%" valign="top">

### Built-in Diff Viewer
See exactly what each agent changed with syntax highlighting. Compare against main, review commits, and decide what to keep.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Permission Control
**Fast & Flexible** — auto-approve everything for trusted workflows.<br/>
**Secure & Controlled** — review each action before it runs.

</td>
<td width="50%" valign="top">

### Full Git Workflow
Fetch, commit, pull, push, stash, rebase from main, merge to main — all from the sidebar. No terminal needed.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Smart Notifications
Desktop alerts when an agent finishes, hits an error, or needs your input. Never miss a prompt again.

</td>
<td width="50%" valign="top">

### Multi-Tool Support
Native integration for Claude Code and Codex. Add Aider, Goose, or any CLI tool via custom commands.

</td>
</tr>
</table>

<p align="center">
  <img src="screenshots/screenshot-create.png" alt="Create workspace dialog with permission mode" width="500" />
</p>
<p align="center"><em>Create a workspace: pick your agent, set permissions, write your prompt.</em></p>

## How It Works

```
You create a session with a prompt
         │
         ▼
Zync creates an isolated git worktree + branch
         │
         ▼
AI agent runs in that worktree (no conflicts with other sessions)
         │
         ▼
You review the diff, then merge to main or archive
```

<details>
<summary>Architecture diagram</summary>
<p align="center">
  <img src="docs/diagrams/architecture.svg" alt="Zync Architecture" width="850" />
</p>
</details>

<details>
<summary>Workflow diagram</summary>
<p align="center">
  <img src="docs/diagrams/workflow.svg" alt="Zync Workflow" width="850" />
</p>
</details>

<details>
<summary>Worktree isolation diagram</summary>
<p align="center">
  <img src="docs/diagrams/worktree.svg" alt="Git Worktree Isolation" width="850" />
</p>
</details>

<details>
<summary>Panel system diagram</summary>
<p align="center">
  <img src="docs/diagrams/panels.svg" alt="Zync Panel System" width="850" />
</p>
</details>

## Configuration

**Smart workspace naming** — Zync can auto-name sessions using AI. Set these in `start.bat` or your environment:

```bash
OPENAI_API_KEY=your-openrouter-key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=anthropic/claude-haiku-4-5
```

**Settings** (`Ctrl + ,`): Theme (Light/Dark/OLED), UI scale, terminal shell, security mode, custom Claude path, notification preferences.

**Keyboard shortcuts**: `Ctrl+K` command palette, `Ctrl+N` new workspace, `Ctrl+B` toggle sidebar, `Ctrl+Enter` send to AI. Full list in the app's Help dialog (`?` button).

## Known Limitations

Zync orchestrates AI agents. It does not replace your IDE.

- **No code editor** — use VS Code or PyCharm for editing. Zync has an "Open in IDE" button for every workspace.
- **No debugger, no LSP, no plugins** — those live in your IDE. Zync focuses on the agent workflow layer.

These are intentional. Zync does one thing well.

## Contributing

We'd love help. Some areas where contributions are especially welcome:

- Performance optimization for large projects (Explorer, Diff)
- Plugin system for custom agent integrations
- Workspace templates (pre-configured agent + prompt combos)
- Session statistics dashboard (tokens, time, cost)
- i18n / localization support

Found a bug or have an idea? [Open an issue](https://github.com/24kchengYe/Zync/issues). PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Documentation

- [中文使用指南 / Chinese Guide](GUIDE_CN.md)
- [Adding New CLI Tools](docs/ADDING_NEW_CLI_TOOLS.md)
- [Implementing New CLI Agents](docs/IMPLEMENTING_NEW_CLI_AGENTS.md)
- [Building on Windows](docs/BUILDING_ON_WINDOWS.md)
- [Setup Troubleshooting](docs/troubleshooting/SETUP_TROUBLESHOOTING.md)
- [Database Schema](docs/DATABASE_DOCUMENTATION.md)

## License

AGPL-3.0 — See [LICENSE](LICENSE)

---

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=24kchengYe.Zync)

[![Star History Chart](https://api.star-history.com/svg?repos=24kchengYe/Zync&type=Date)](https://star-history.com/#24kchengYe/Zync&Date)
