# Code Quality Gate — BMad Module

> **BMad-compliant CI/CD module** for automated PR quality enforcement via GitHub Actions

Server-side AI gatekeeper that automatically scans pull requests for security vulnerabilities, repository impact, and platform-specific best practices. Blocks the merge button when violations are found.

---

## Quick Start

### For BMad Users

```bash
# Install the module
npx bmad-method install --module https://github.com/dept/dtin-commit-agent

# Get setup guidance
bmad-help setup-code-guardian

# Or invoke the workflow directly
workflows/setup-pr-gate/workflow.md
```

### Without BMad

See `SETUP.md` for traditional deployment.

---

## What This Module Provides

### BMad Integration

| Component | Type | Access Code |
| --- | --- | --- |
| Code Guardian Skill | Automation | `CG` |
| Setup Workflow | Guided Process | `SETUP-CG` |

### Supported Platforms & Violations Caught

| Platform | File Triggers | What It Detects |
| --- | --- | --- |
| **AEM Core & EDS** | `/apps/`, `/libs/`, `/blocks/`, `.java`, `.jsp`, `.xml` | Unclosed `ResourceResolver`, HTL context security, native DOM in EDS blocks |
| **Modern Frontend** | `.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.css`, `.scss` | `dangerouslySetInnerHTML`, missing React keys, broken `useEffect` deps |
| **Magento & PHP** | `/app/code/`, `/vendor/magento/`, `.php`, `.phtml` | Direct `ObjectManager` calls, raw SQL, N+1 collection loops |

**Security Overlay (always evaluated):** XSS, SQL injection, hardcoded secrets, path traversal, weak crypto

---

## Supported AI Providers

| Provider | Models | Secret Names | Cost (est. per PR) |
| --- | --- | --- | --- |
| **Anthropic Claude** | `claude-sonnet-4`, `claude-opus-4`, `claude-haiku-4` | `AI_PROVIDER=claude`<br/>`ANTHROPIC_API_KEY` | $0.03-0.05 |
| **OpenAI ChatGPT** | `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo` | `AI_PROVIDER=openai`<br/>`OPENAI_API_KEY` | $0.05-0.10 |
| **GitHub Copilot** | `gpt-4o` | `AI_PROVIDER=copilot`<br/>`COPILOT_PAT` (or GitHub App) | Included in seat |
| **Azure OpenAI** | Your deployment | `AI_PROVIDER=azure`<br/>`AI_API_KEY` + `AI_BASE_URL` | Varies |
| **Custom (Groq, etc)** | OpenAI-compatible | `AI_PROVIDER=custom`<br/>`AI_API_KEY` + `AI_BASE_URL` | Varies |

### Quick Configuration

Just set 2-3 GitHub secrets:

```bash
# For Claude (recommended)
gh secret set AI_PROVIDER --body "claude"
gh secret set AI_MODEL --body "claude-sonnet-4-20250514"
gh secret set ANTHROPIC_API_KEY --body "sk-ant-..."

# For OpenAI
gh secret set AI_PROVIDER --body "openai"
gh secret set AI_MODEL --body "gpt-4o"
gh secret set OPENAI_API_KEY --body "sk-..."

# For Copilot (legacy, still works)
gh secret set COPILOT_PAT --body "ghp_..."
```

**Backward compatible:** Existing `COPILOT_PAT` secrets still work without any changes.

---

## Architecture

**Hybrid BMad + GitHub Actions Design:**

- **BMad Layer:** Skills, workflows, documentation, configuration
- **Runtime Layer:** TypeScript orchestrator executing on GitHub Actions runners
- **AI Layer:** Multi-provider support (Copilot, Claude, OpenAI, Azure, custom)

```
Developer opens PR
    ↓
GitHub Actions triggers (via .github/workflows/code-guardian.yml)
    ↓
Runner executes TypeScript orchestrator (src/)
    ↓
Orchestrator loads prompts from skills/code-guardian/prompts/
    ↓
AI analyzes each code chunk (via selected provider)
    ↓
Aggregated verdict → exit code 0 (pass) or 1 (fail)
    ↓
GitHub blocks merge if failed
```

---

## Module Structure

```
code-quality-gate/
├── module-help.csv              ← BMad catalog
├── module.config.yaml           ← BMad configuration
├── skills/
│   └── code-guardian/
│       ├── SKILL.md             ← Skill definition (BMad)
│       ├── prompts/             ← AI prompts (runtime)
│       └── schemas/             ← Output validation
├── workflows/
│   └── setup-pr-gate/           ← Installation workflow (BMad)
├── .github/workflows/           ← GitHub Actions (runtime)
├── src/                         ← TypeScript orchestrator (runtime)
│   ├── ai-client.ts             ← Multi-provider AI client
│   ├── copilot-client.ts        ← Legacy Copilot client
│   └── ...
└── package.json                 ← Node.js dependencies (runtime)
```

**Key Insight:** BMad layer provides documentation and discoverability; TypeScript layer provides execution.

---

## Configuration

Via `module.config.yaml` or environment variables:

| Option | Default | Description |
| --- | --- | --- |
| `ai_provider` | `copilot` | Use `copilot`, `claude`, `openai`, `azure`, or `custom` |
| `ai_model` | (auto) | Specific model (e.g., `claude-sonnet-4`, `gpt-4o`) |
| `concurrency` | `4` | Parallel chunk analysis |
| `slack_enabled` | `false` | Send failure notifications to Slack |
| `email_enabled` | `false` | Send failure notifications via email |

---

## License

UNLICENSED — Internal use only

---

## Links

- **Setup Guide:** `SETUP.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Troubleshooting:** `docs/TROUBLESHOOTING.md`
- **BMad Workflow:** `workflows/setup-pr-gate/workflow.md`
- **Changes Log:** `CHANGES.md`
