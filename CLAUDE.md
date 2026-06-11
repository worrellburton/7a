@AGENTS.md

# Deployment workflow

`main` is the source-of-truth branch; **Vercel builds production from
`master`** (confirmed 2026-06-11: pushes to `main` only create preview
deployments — production sat five PRs stale until `master` was synced).
Every change lands on `main` first, then `master` is synced from `main`
to deploy.

After every prompt that results in a code change, ship it:

1. Commit on the current feature branch with a descriptive message.
2. Push the feature branch: `git push -u origin <branch>`.
3. Open a PR into `main` and merge it (squash is fine).
4. **Deploy**: open a PR from `main` into `master` and merge it with a
   MERGE COMMIT (not squash — squashing diverges the branches and the
   next sync conflicts). Verify the merged tree is identical to `main`
   before merging. This push to `master` is what triggers the
   production deployment.

Never commit work directly to `master` — it receives only syncs from
`main`, so the two can never drift apart in content. (That drift is
exactly what once silently dropped shipped features from production.)
If the Vercel project's Production Branch setting is ever flipped to
`main`, delete step 4 and retire `master` again.

Never skip hooks (`--no-verify`), never force push, and never rewrite
published history.

# Supabase migrations

When a code change depends on a new column, table, trigger, or policy:

1. **Apply the migration first, ship the code second.** Use `mcp__supabase__apply_migration` in the same turn as the code change — never leave a "run this migration later" handoff. A code path that reads a column that doesn't exist yet will silently fail and can blank out critical state (this is exactly what once hid Team / Super Admin from every admin's sidebar).
2. **Commit the `.sql` file to `supabase/migrations/`** so the change is reproducible from source control even though we applied it via MCP.
3. **Make reads resilient.** Any query whose failure would hide core UI (auth profile, admin state, etc.) must degrade gracefully — fall back to a smaller select, log the degraded path to the console, never silently return.
4. **Verify by running a `select` after applying** (`mcp__supabase__execute_sql`) so the data looks right before moving on.
