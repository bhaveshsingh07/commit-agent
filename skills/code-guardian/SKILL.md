---
name: code-guardian
type: automation
category: ci-cd
version: 1.0.0
menu_code: CG

description: |
  Server-side gatekeeper that automatically scans every PR for security 
  vulnerabilities, repository impact, and platform-specific best practices. 
  Blocks merge button when violations are found.

summary: |
  Scans git diffs across three validation pillars (security, repo impact, 
  best practices) using AI-powered analysis. Routes code chunks by language/
  platform (AEM, React/TS, Magento/PHP) to specialized prompts. Fails the 
  GitHub Actions workflow and freezes merge on any violation.

trigger: |
  Automatically invoked by GitHub Actions on pull_request events 
  (opened, synchronize, reopened) in repositories where the consumer 
  workflow is installed.

runtime:
  type: node
  version: ">=20"
  environment: github-actions
  execution: server-side

inputs:
  - name: diff_path
    type: file
    required: true
    description: Path to unified git diff (e.g., /tmp/push_modifications.diff)
  
  - name: pr_context
    type: object
    required: true
    properties:
      number: PR number
      repo: Repository in owner/name format
      sha: Head commit SHA
      author: PR author login
    description: PR metadata passed from GitHub Actions context

outputs:
  - name: verdict
    type: object
    schema: schemas/output-contract.json
    properties:
      isCompliant: boolean
      results: array of ChunkResult objects
      totalChunks: integer
      violations: integer
    description: Aggregated compliance verdict across all diff chunks
  
  - name: exit_code
    type: integer
    values: [0, 1]
    description: 0 = pass (merge allowed), 1 = fail (merge blocked)

side_effects:
  - Posts comment on GitHub PR with violation details
  - Sends Slack notification (if configured)
  - Sends email alert (if configured)
  - Exits with code 1 to fail the GitHub Actions workflow

dependencies:
  external:
    - GitHub Actions (runner infrastructure)
    - GitHub Copilot API or Anthropic Claude API
  internal:
    - prompts/security.md (always evaluated)
    - prompts/aem.md (AEM/Java/JSP/XML files)
    - prompts/frontend.md (JS/TS/React/HTML/CSS files)
    - prompts/magento.md (PHP/Magento files)
    - schemas/output-contract.json (response validation)

related_workflows:
  - setup-pr-gate (Installation workflow)

tags:
  - security-scanning
  - code-review
  - pr-automation
  - merge-blocking
---

# Code Guardian — Agent-as-Code Specification

This skill is **declarative**. It is consumed by `src/orchestrator.ts` at
runtime, which reads the routing matrix and prompt references below and uses
them to build Copilot API requests. The skill is also the single source of
truth for prompt engineering — edit the files in `prompts/` and every
consumer repo picks up the change on the next PR.

---

## 1. Pillars of validation

Every diff chunk MUST be evaluated against all three pillars:

1. **Security** — XSS, raw SQL injection, hardcoded secrets, unprotected
   resource handling, path traversal, unsafe deserialisation, missing CSRF
   protection, weak crypto, command injection.
2. **Repository impact** — code bloat, duplication, layering violations,
   inconsistencies with surrounding modules, introduction of unmanaged
   dependencies.
3. **Best practices** — language-and-platform-specific cleanliness from the
   appropriate bucket below.

---

## 2. Language routing matrix

The orchestrator inspects each chunk's `file_path` and dispatches as follows:

| Bucket | Path/Extension Triggers | Prompt File |
| --- | --- | --- |
| `aem` | `/apps/`, `/libs/`, `/blocks/`, `/scripts/` (when extension is `.java`, `.jsp`, `.xml`, `.html`) | `prompts/aem.md` |
| `frontend` | `.js`, `.jsx`, `.ts`, `.tsx`, `.html`, `.css`, `.scss`, `.mjs`, `.cjs` | `prompts/frontend.md` |
| `magento` | `/app/code/`, `/vendor/magento/`, `.php`, `.phtml` | `prompts/magento.md` |
| `security` (overlay) | All chunks regardless of bucket | `prompts/security.md` |

The `security.md` prompt is **always** evaluated in addition to the
language-specific prompt. The orchestrator merges both verdicts and treats
the chunk as non-compliant if either flips `isCompliant: false`.

A chunk that matches no language bucket (e.g. `.md`, `.lock`, image binary)
is skipped — security overlay still runs if the content is textual.

---

## 3. Output contract

The orchestrator binds a **zero-shot strict-JSON constraint** to every
Copilot request. The model MUST reply with exactly this structure:

```json
{
  "isCompliant": false,
  "issue": "Concise description of the rule that was broken.",
  "remediation": "Concrete fix, including a corrected code snippet."
}
```

See `schemas/output-contract.json` for the JSON Schema used to validate
every response. Any malformed response is treated as a failed scan
(fail-closed) and the workflow exits 1.

---

## 4. Per-chunk request lifecycle

For each `CodeBlock` extracted from the diff:

1. Determine bucket via `language-router.ts`.
2. Load `prompts/security.md` + the bucket-specific prompt.
3. Concatenate into a system message:
   ```
   <security-overlay>...</security-overlay>
   <bucket-rules>...</bucket-rules>
   <output-contract>strict JSON only</output-contract>
   ```
4. Send the chunk as the user message with headers:
   ```
   Authorization: Bearer ${COPILOT_PAT}
   Copilot-Integration-Id: vscode-chat
   Content-Type: application/json
   ```
5. POST to `https://api.githubcopilot.com/chat/completions`.
6. Parse, validate against `schemas/output-contract.json`.
7. Accumulate verdicts.

---

## 5. Fail-closed semantics

- Network timeout, 5xx from Copilot, malformed JSON → treat as non-compliant.
- Empty diff → treat as compliant (no changes to gate).
- File outside any bucket and security overlay clean → compliant.
- Any non-compliant chunk → final verdict non-compliant, `process.exit(1)`.

---

## 6. Notification fan-out

After all chunks are evaluated, the orchestrator hands the aggregated
verdict to `src/reporter.ts`, which fans out to:

- GitHub PR comment (always)
- Slack webhook (if `SLACK_WEBHOOK_URL` set)
- Email distribution list (if SMTP secrets set)

---

## 7. Versioning

Bump the `version` field in this frontmatter **and** the package's
`package.json` when changing the routing matrix or output contract.
Consumer repos pin to `@main` by default; for stricter environments,
pin to a tag like `@v1.0.0`.
