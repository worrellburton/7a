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
