-- Run once in a Supabase project after creating the owner's Auth account.
-- Replace the zero UUID with that account's UUID before running.
begin;

create table public.public_device_ledger (
  id integer primary key check (id = 1),
  owner_id uuid not null references auth.users(id),
  revision integer not null default 0 check (revision >= 0),
  devices jsonb not null default '[]'::jsonb check (
    jsonb_typeof(devices) = 'array' and octet_length(devices::text) <= 1200000
  ),
  published_at timestamptz
);

alter table public.public_device_ledger enable row level security;
revoke all on public.public_device_ledger from public, anon, authenticated;
grant select (id, revision, devices, published_at) on public.public_device_ledger to anon, authenticated;
grant update (devices, revision) on public.public_device_ledger to authenticated;

create policy "Anyone can read the published device ledger"
  on public.public_device_ledger for select to anon, authenticated using (true);
create policy "Only the owner can publish"
  on public.public_device_ledger for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create function public.validate_device_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.revision <> old.revision + 1 then
    raise exception 'Invalid publication revision';
  end if;
  if exists (
    select 1 from jsonb_array_elements(new.devices) as entry(device)
    where jsonb_typeof(device) <> 'object'
       or not (device ?& array['name','brand','category','status','purchased_on','disposed_on','value'])
       or (device - array['name','brand','category','status','purchased_on','disposed_on','value']) <> '{}'::jsonb
       or jsonb_typeof(device->'name') <> 'string'
       or jsonb_typeof(device->'brand') <> 'string'
       or jsonb_typeof(device->'category') <> 'string'
       or jsonb_typeof(device->'status') <> 'string'
       or jsonb_typeof(device->'purchased_on') <> 'string'
       or jsonb_typeof(device->'disposed_on') <> 'string'
       or jsonb_typeof(device->'value') <> 'number'
  ) then
    raise exception 'Only public device fields may be published';
  end if;
  new.published_at = now();
  return new;
end;
$$;

create trigger validate_device_publication
before update on public.public_device_ledger
for each row execute function public.validate_device_publication();

insert into public.public_device_ledger (id, owner_id)
values (1, '00000000-0000-0000-0000-000000000000');

commit;
