# BMAD Code Guardian

Server-side, un-bypassable AI gatekeeper for pull requests. Runs on GitHub
self-hosted runners, inspects every code delta with GitHub Copilot's
programmatic completions API, and blocks the **Merge Pull Request** button
when the AI finds non-compliant patterns.

> Built on the **BMAD (Breakthrough Method for Agile AI-Driven Development)**
> framework, so a single central module governs every microservice in the org.

---

## What it enforces

Every `git diff` chunk is scrutinised across three pillars:

1. **Security** — XSS, SQL injection, hardcoded secrets, unprotected resource
   handling, path traversal, deserialisation flaws.
2. **Repository impact** — bloat, drift from project conventions, duplication,
   broken layering.
3. **Best practices** — language and platform-specific cleanliness rules.

Three language buckets are routed automatically based on file paths and
extensions:

| Bucket | Triggers | Focus |
| --- | --- | --- |
| **AEM Core & EDS** | `/apps/`, `/libs/`, `/blocks/`, `/scripts/`, `.java`, `.jsp`, `.xml` | Unclosed `ResourceResolver`, HTL context security, native DOM in EDS blocks |
| **Modern Frontend** | `.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.css`, `.scss` | `dangerouslySetInnerHTML`, missing React keys, `useEffect` deps |
| **Magento & PHP** | `/app/code/`, `/vendor/magento/`, `.php`, `.phtml` | Direct `ObjectManager` calls, raw SQL, N+1 collection loops |

---

## Repository layout

```
commit-agent/
├── .claude-plugin/
│   └── marketplace.json          # Plugin manifest for the BMAD ecosystem
├── skills/
│   └── code-guardian/
│       ├── SKILL.md              # Agent-as-Code declarative spec
│       ├── prompts/              # Per-language system prompts
│       └── schemas/              # JSON output contract
├── src/                          # TypeScript orchestrator
│   ├── index.ts
│   ├── orchestrator.ts
│   ├── diff-parser.ts
│   ├── language-router.ts
│   ├── copilot-client.ts
│   ├── reporter.ts
│   ├── types.ts
│   └── notifiers/
│       ├── github.ts
│       ├── slack.ts
│       └── email.ts
├── workflows/
│   ├── code-guardian.yml         # Reusable workflow (lives in central repo)
│   └── reusable-guardian.yml     # 15-line caller dropped into every repo
├── scripts/
│   ├── setup-mac.sh              # One-shot macOS dev setup
│   ├── install-runner-mac.sh     # Install GitHub self-hosted runner on macOS
│   ├── cleanup-workspace.sh      # Pre-run purification (rm -rf workspace)
│   └── run-local.sh              # Run the orchestrator against a local diff
├── config/
│   ├── ruleset.example.json      # GitHub Repository Ruleset
│   └── env.example               # Required env vars
├── docs/
│   ├── ARCHITECTURE.md
│   └── TROUBLESHOOTING.md
├── package.json
├── tsconfig.json
├── .gitignore
├── SETUP.md
└── README.md
```

---

## Quick start (macOS)

```bash
# 1. Unzip the package and enter it
unzip commit-agent.zip
cd commit-agent

# 2. Run the macOS setup (installs Node, TS, deps, lints the project)
chmod +x scripts/*.sh
./scripts/setup-mac.sh

# 3. (Optional) Try the orchestrator against a local diff
git diff main...HEAD > /tmp/push_modifications.diff
./scripts/run-local.sh /tmp/push_modifications.diff
```

See **[SETUP.md](SETUP.md)** for the full server-side install path (self-hosted
runner, GitHub Repository Ruleset, Copilot PAT, Slack/email notifiers).

---

## How a PR flows through the system

```
[GitHub PR opened/synchronize/reopened]
        │
        ▼ (long-poll meta signal)
[Self-hosted runner on corp network]
        │
        ▼ (cleanup-workspace.sh)
[Volatile workspace] ──(git diff)──> /tmp/push_modifications.diff
        │
        ▼ (Node.js orchestrator reads the diff)
[Diff parser] ──> CodeBlock[]
        │
        ▼ (language router by path + extension)
[AEM | Frontend | Magento prompt selectors]
        │
        ▼ (Copilot completions API, programmatic)
[Strict JSON: { isCompliant, issue, remediation }]
        │
        ▼
[Reporter] ──> PR comment + Slack webhook + Email
        │
        ▼ (any false verdict)
process.exit(1) ──> required status check red ──> merge button frozen
```

---

## License

Internal — distribute only inside your organisation.
