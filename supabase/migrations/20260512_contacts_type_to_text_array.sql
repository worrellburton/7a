-- Multi-select Type. The single-value text column gets converted to
-- text[] in place: existing non-empty values become a single-element
-- array, NULL stays NULL. Order of values is preserved by-id so the
-- UI can show consistent chip order.
alter table public.contacts
  alter column type type text[]
  using case
    when type is null or type = '' then null
    else array[type]
  end;

comment on column public.contacts.type is 'Service-type tags (multi-select). Each element is one tag (Detox, PHP, IOP, RTC, Outpatient, Extended Care, Interventionist, Therapist, or any ad-hoc value typed inline).';
