-- DM privacy for chat_messages. DM rooms are keyed 'dm:<uidA>:<uidB>'
-- (uids sorted), so participant membership is testable straight off
-- the room string. The old select policy was USING (true), which
-- would have let any signed-in user read — or realtime-subscribe to —
-- anyone else's DMs. Group rooms (anything not 'dm:%') stay readable
-- by all authenticated users.
drop policy if exists "chat_messages_select_authed" on public.chat_messages;
create policy "chat_messages_select_authed"
  on public.chat_messages for select
  to authenticated
  using (
    room not like 'dm:%'
    or room like ('%' || auth.uid()::text || '%')
  );

-- Inserts must also stop a user writing INTO someone else's DM room.
drop policy if exists "chat_messages_insert_self" on public.chat_messages;
create policy "chat_messages_insert_self"
  on public.chat_messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      room not like 'dm:%'
      or room like ('%' || auth.uid()::text || '%')
    )
  );
