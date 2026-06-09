-- Bump hardware_items.updated_at on every UPDATE so the new "Last
-- updated" column on /app/hardware shows real activity instead of
-- the row's creation timestamp forever. Uses the project-wide
-- public.set_updated_at() trigger function (defined alongside
-- contacts / partners / etc).
drop trigger if exists hardware_items_set_updated_at on public.hardware_items;
create trigger hardware_items_set_updated_at
  before update on public.hardware_items
  for each row execute function public.set_updated_at();
