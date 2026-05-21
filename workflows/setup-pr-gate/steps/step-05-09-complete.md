# Steps 5-9: Runner Installation Through Testing

## Step 5: Install Self-Hosted Runner

See `SETUP.md` Phase 2 for detailed Linux/macOS instructions.

**Quick checklist:**
- [ ] Runner downloaded and extracted
- [ ] Configured with labels: `self-hosted,linux,x64,code-guardian` (or `macos` if Mac)
- [ ] Installed as systemd/launchd service
- [ ] Shows green "Idle" status in GitHub UI

---

## Step 6: Add Workflow to Consumer Repos

In each repo you want to protect:

**Create `.github/workflows/code-guardian.yml`:**
```yaml
name: Code Guardian
on:
  pull_request:
    types: [opened, synchronize, reopened]
permissions:
  contents: read
  pull-requests: write
  issues: write
jobs:
  scan:
    uses: YOUR_ORG/commit-agent/.github/workflows/code-guardian.yml@main
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Replace `YOUR_ORG/commit-agent` with your actual central repo path.

---

## Step 7: Configure Branch Protection

**For organization (Team/Enterprise plan):**
Apply the ruleset from `config/ruleset.example.json`:
```bash
gh api --method POST /orgs/YOUR_ORG/rulesets --input config/ruleset.example.json
```

**For personal account or per-repo:**
1. Repo → Settings → Branches → Add branch protection rule
2. Branch pattern: `main`
3. ✅ Require status checks: `Code Guardian / scan`
4. ✅ Require branches up to date before merging

---

## Step 8: Test with a Violation PR

```bash
cd YOUR_CONSUMER_REPO
git checkout -b test/violation

# Create a file with a known violation
cat > src/Unsafe.jsx <<'EOF'
export function Unsafe({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
EOF

git add src/Unsafe.jsx
git commit -m "test: add unsafe component"
git push -u origin test/violation

# Open PR via UI or CLI
gh pr create --title "Test PR" --body "Testing Code Guardian"
```

**Expected:**
- Workflow runs within 60 seconds
- Check turns red
- Bot posts comment with violation details
- Merge button is greyed out

---

## Step 9: Verify Blocking Works

Try to merge the test PR:
- **Merge button should be disabled**
- Tooltip: "Required status check has not succeeded"

Fix the violation:
```bash
git checkout test/violation
cat > src/Unsafe.jsx <<'EOF'
import { useRef, useEffect } from 'react';
export function Safe({ text }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) ref.current.textContent = text;
  }, [text]);
  return <div ref={ref} />;
}
EOF
git add src/Unsafe.jsx
git commit -m "fix: remove dangerouslySetInnerHTML"
git push
```

**Expected:**
- Workflow re-runs
- Check turns green
- Merge button unlocks

## Setup Complete!

Your Code Guardian is now active. See `docs/ARCHITECTURE.md` for how it works internally.
