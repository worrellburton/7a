@AGENTS.md

# Deployment workflow

`main` is the live deploy branch — Vercel builds production from `main`.
Every change ends there.

After every prompt that results in a code change, ship it:

1. Commit on the current feature branch with a descriptive message.
2. Push the feature branch: `git push -u origin <branch>`.
3. Open a PR into `main` and merge it (squash is fine), OR if working
   directly, merge the feature branch into `main`
   (`git checkout main && git merge --no-ff <branch>`) and push:
   `git push -u origin main`.

That's it — merging to `main` deploys. There is no longer a `master`
step. (`master` was the old deploy branch; it drifted behind `main`
and silently dropped shipped features from production until the two
were reconciled. Do not resurrect a second long-lived deploy branch —
one source of truth.)

Never skip hooks (`--no-verify`), never force push, and never rewrite
published history.

# Supabase migrations

When a code change depends on a new column, table, trigger, or policy:

1. **Apply the migration first, ship the code second.** Use `mcp__supabase__apply_migration` in the same turn as the code change — never leave a "run this migration later" handoff. A code path that reads a column that doesn't exist yet will silently fail and can blank out critical state (this is exactly what once hid Team / Super Admin from every admin's sidebar).
2. **Commit the `.sql` file to `supabase/migrations/`** so the change is reproducible from source control even though we applied it via MCP.
3. **Make reads resilient.** Any query whose failure would hide core UI (auth profile, admin state, etc.) must degrade gracefully — fall back to a smaller select, log the degraded path to the console, never silently return.
4. **Verify by running a `select` after applying** (`mcp__supabase__execute_sql`) so the data looks right before moving on.
