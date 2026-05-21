# Code Quality Gate — BMad Module

> **BMad-compliant CI/CD module** for automated PR quality enforcement via GitHub Actions

Server-side AI gatekeeper that automatically scans pull requests for security vulnerabilities, repository impact, and platform-specific best practices. Blocks the merge button when violations are found.

---

## Quick Start

### For BMad Users

```bash
# Install the module
npx bmad-method install --module https://github.com/bhaveshsingh07/commit-agent

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

## Architecture

**Hybrid BMad + GitHub Actions Design:**

- **BMad Layer:** Skills, workflows, documentation, configuration
- **Runtime Layer:** TypeScript orchestrator executing on GitHub Actions runners
- **AI Layer:** GitHub Copilot or Anthropic Claude for code analysis

```
Developer opens PR
    ↓
GitHub Actions triggers (via .github/workflows/code-guardian.yml)
    ↓
Runner executes TypeScript orchestrator (src/)
    ↓
Orchestrator loads prompts from skills/code-guardian/prompts/
    ↓
AI analyzes each code chunk
    ↓
Aggregated verdict → exit code 0 (pass) or 1 (fail)
    ↓
GitHub blocks merge if failed
```

---

## Supported Platforms

- **AEM Core & Edge Delivery Services** — Java, JSP, HTL, XML
- **Modern Frontend** — React, TypeScript, JavaScript, HTML, CSS
- **Magento Commerce** — PHP, Magento 2 framework

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
└── package.json                 ← Node.js dependencies (runtime)
```

**Key Insight:** BMad layer provides documentation and discoverability; TypeScript layer provides execution.

---

## Configuration

Via `module.config.yaml` or environment variables:

| Option | Default | Description |
| --- | --- | --- |
| `ai_provider` | `copilot` | Use `copilot` or `claude` |
| `concurrency` | `4` | Parallel chunk analysis |
| `slack_enabled` | `false` | Send failure notifications to Slack |
| `email_enabled` | `false` | Send failure notifications via email |

---

## License

UNLICENSED — Internal use only
