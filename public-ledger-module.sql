-- Add the full device module while retaining previously published summaries.
begin;
alter table public.public_device_ledger
  add column if not exists ledger jsonb check (
    ledger is null or (
      jsonb_typeof(ledger) = 'object'
      and ledger ?& array['version', 'devices', 'nextAssetNo']
      and (ledger - array['version', 'devices', 'nextAssetNo']) = '{}'::jsonb
      and ledger->'version' = '4'::jsonb
      and jsonb_typeof(ledger->'devices') = 'array'
      and jsonb_typeof(ledger->'nextAssetNo') = 'number'
      and octet_length(ledger::text) <= 2000000
    )
  );
grant select (ledger) on public.public_device_ledger to anon, authenticated;
grant update (ledger) on public.public_device_ledger to authenticated;
commit;
