# Step 2: Deploy Central Repository

The central repository holds all scanning logic, prompts, and orchestration code. 
You deploy it once; every consumer repo references it.

## Create the Repository

### Via GitHub CLI:
```bash
gh repo create YOUR_ORG/commit-agent --private --confirm
```

### Via GitHub UI:
1. Go to github.com/organizations/YOUR_ORG/repositories/new
2. Name: `commit-agent` (or `code-quality-gate`)
3. Visibility: Private (or Public for testing)
4. Click **Create repository**

## Push the Code

```bash
# From your local copy of this module
cd /path/to/code-quality-gate-bmad

# Initialize if not already a git repo
git init
git add .
git commit -m "initial: code quality gate module"

# Connect to GitHub
git branch -M main
git remote add origin git@github.com:YOUR_ORG/commit-agent.git

# Push
git push -u origin main
```

## Verify the Deployment

Check that these files are visible on GitHub:

- [ ] `.github/workflows/code-guardian.yml` (the reusable workflow)
- [ ] `src/` directory (TypeScript orchestrator)
- [ ] `skills/code-guardian/` (prompts and SKILL.md)
- [ ] `package.json` (Node.js dependencies)

**Direct link format:**
`https://github.com/YOUR_ORG/commit-agent/blob/main/.github/workflows/code-guardian.yml`

## Update References

If you changed the repo name from `commit-agent` to something else, update:

1. `workflows/reusable-guardian.yml` — the `uses:` path
2. `.github/workflows/code-guardian.yml` — the checkout step's `repository:` field
3. `module.config.yaml` — the `homepage` and `repository` URLs

**Quick find & replace:**
```bash
# Replace YOUR_ORG and YOUR_REPO_NAME
grep -rl "bhaveshsingh07/commit-agent" . | xargs sed -i '' 's|bhaveshsingh07/commit-agent|YOUR_ORG/YOUR_REPO_NAME|g'
```

## Next Step

**Step 3:** Add Secrets (`step-03-add-secrets.md`)
