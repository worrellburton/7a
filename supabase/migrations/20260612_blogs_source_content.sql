-- Step 1 of the content pipeline becomes dual-mode: write a prompt
-- for Claude to draft from, OR paste your own copy and have
-- "Generate body" use that as the main content (structured to
-- markdown, wording preserved).
-- (Applied via MCP on 2026-06-12; committed here for reproducibility.)

alter table public.blogs
  add column if not exists source_mode text not null default 'prompt'
    check (source_mode in ('prompt', 'content')),
  add column if not exists source_content text;
