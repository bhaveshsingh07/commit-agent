---
name: code-guardian
description: Server-side gatekeeper skill that scans every git diff chunk in a pull request across security, repository impact, and best-practices. Use whenever a GitHub PR is opened, synchronized, or reopened against a repository in the org. Routes file paths and extensions into AEM/Java/JSP/XML, Modern Frontend (JS/TS/React/HTML/CSS), or Magento/PHP buckets, dispatches each chunk to GitHub Copilot's programmatic completions API with a zero-shot strict-JSON contract, and emits a single boolean compliance verdict that the runner uses to fail the workflow and freeze the merge button.
version: 1.0.0
runtime: node>=20
inputs:
  - name: diff_path
    type: file
    required: true
    description: Path to the unified git diff produced by the runner (typically /tmp/push_modifications.diff)
  - name: pr_context
    type: object
    required: true
    description: PR metadata { number, repo, sha, author }
outputs:
  - name: verdict
    type: object
    schema: schemas/output-contract.json
    description: Aggregated compliance result across all chunks
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
