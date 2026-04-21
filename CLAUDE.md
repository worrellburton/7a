@AGENTS.md

# Deployment workflow

After every prompt that results in a code change, always ship the change to the live site:

1. Commit on the current feature branch with a descriptive message.
2. Push the feature branch: `git push -u origin <branch>`.
3. Merge the feature branch into `main` (`git checkout main && git merge --no-ff <branch>`).
4. Push `main`: `git push -u origin main`.
5. Merge `main` into `master` (`git checkout master && git merge --ff-only main` — or `--no-ff` if a merge commit is needed).
6. Push `master`: `git push -u origin master`.

`master` is the live deploy branch — every change ends there.

Never skip hooks (`--no-verify`), never force push, and never rewrite published history.

# Supabase migrations

When a code change depends on a new column, table, trigger, or policy:

1. **Apply the migration first, ship the code second.** Use `mcp__supabase__apply_migration` in the same turn as the code change — never leave a "run this migration later" handoff. A code path that reads a column that doesn't exist yet will silently fail and can blank out critical state (this is exactly what once hid Team / Super Admin from every admin's sidebar).
2. **Commit the `.sql` file to `supabase/migrations/`** so the change is reproducible from source control even though we applied it via MCP.
3. **Make reads resilient.** Any query whose failure would hide core UI (auth profile, admin state, etc.) must degrade gracefully — fall back to a smaller select, log the degraded path to the console, never silently return.
4. **Verify by running a `select` after applying** (`mcp__supabase__execute_sql`) so the data looks right before moving on.
