-- ===========================================
-- ONE-SHOT HARDENING + COMPAT LAYER (IDEMPOTENT)
-- ===========================================

-- 0) Extensions (safe if already present)
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron   with schema extensions;

-- 1) PUBLIC SNAPSHOTS: RLS + UUID default + public/owner policies + grants
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='public_snapshots'
  ) then
    -- Ensure RLS ON
    execute 'alter table public.public_snapshots enable row level security';

    -- Standardize UUID default to gen_random_uuid()
    begin
      execute 'alter table public.public_snapshots alter column id set default gen_random_uuid()';
    exception when undefined_function then
      null; -- pgcrypto not loaded (shouldn't happen due to create extension above)
    end;

    -- Public can read active, non-expired snapshots (for social sharing)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='public_snapshots'
        and policyname='Public can view active snapshots'
    ) then
      execute $pol$
        create policy "Public can view active snapshots"
        on public.public_snapshots
        for select
        to anon, authenticated
        using (
          is_active = true
          and (coalesce(expires_at, now() + interval '100 years') > now())
        );
      $pol$;
    end if;

    -- Owners can always read their rows
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='public_snapshots'
        and policyname='Owners can view own snapshots'
    ) then
      execute $pol$
        create policy "Owners can view own snapshots"
        on public.public_snapshots
        for select
        to authenticated
        using (auth.uid() = user_id);
      $pol$;
    end if;

    -- Owners can insert
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='public_snapshots'
        and policyname='Owners can insert snapshots'
    ) then
      execute $pol$
        create policy "Owners can insert snapshots"
        on public.public_snapshots
        for insert
        to authenticated
        with check (auth.uid() = user_id);
      $pol$;
    end if;

    -- Owners can update
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='public_snapshots'
        and policyname='Owners can update snapshots'
    ) then
      execute $pol$
        create policy "Owners can update snapshots"
        on public.public_snapshots
        for update
        to authenticated
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
      $pol$;
    end if;

    -- Owners can delete
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='public_snapshots'
        and policyname='Owners can delete snapshots'
    ) then
      execute $pol$
        create policy "Owners can delete snapshots"
        on public.public_snapshots
        for delete
        to authenticated
        using (auth.uid() = user_id);
      $pol$;
    end if;

    -- Privileges (RLS still governs rows)
    execute 'grant select on table public.public_snapshots to anon, authenticated';
    execute 'grant insert, update, delete on table public.public_snapshots to authenticated';
  end if;
end
$$ language plpgsql;

-- 2) STRIPE SAFETY: uniqueness guards (de-dupe)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stripe_orders'
      and column_name='checkout_session_id'
  ) then
    execute 'create unique index if not exists stripe_orders_checkout_session_id_uniq
             on public.stripe_orders (checkout_session_id)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='stripe_subscriptions'
      and column_name='subscription_id'
  ) then
    execute 'create unique index if not exists stripe_subscriptions_subscription_id_uniq
             on public.stripe_subscriptions (subscription_id) where deleted_at is null';
  end if;
end
$$ language plpgsql;

-- 3) OWNER-QUERY INDEXES (speed up common reads)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='journal_entries' and column_name='user_id'
  ) then
    execute 'create index if not exists journal_entries_user_id_idx
             on public.journal_entries (user_id, entry_date desc)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='moodboards' and column_name='user_id'
  ) then
    execute 'create index if not exists moodboards_user_id_idx
             on public.moodboards (user_id, updated_at desc)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='moodboard_updates' and column_name='user_id'
  ) then
    execute 'create index if not exists moodboard_updates_user_idx
             on public.moodboard_updates (user_id, created_at desc)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='goals' and column_name='user_id'
  ) then
    execute 'create index if not exists goals_user_id_idx
             on public.goals (user_id, created_at desc)';
  end if;
end
$$ language plpgsql;

-- 4) SUBSCRIPTIONS LEGACY → COMPAT VIEW on stripe_user_subscriptions
do $$
declare
  obj_kind text;
begin
  -- What is public.subscriptions right now?
  select case c.relkind when 'r' then 'table'
                        when 'v' then 'view'
                        when 'm' then 'mview'
                        when 'f' then 'fview'
                        else null end
  into obj_kind
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='subscriptions';

  -- If it's a table, rename to subscriptions_legacy (replace if already there)
  if obj_kind = 'table' then
    if exists (
      select 1 from information_schema.tables
      where table_schema='public' and table_name='subscriptions_legacy'
    ) then
      execute 'drop table public.subscriptions_legacy cascade';
    end if;
    execute 'alter table public.subscriptions rename to subscriptions_legacy';
  elsif obj_kind in ('view','mview','fview') then
    execute 'drop view if exists public.subscriptions cascade';
  end if;

  -- Create a read-only compatibility view if canonical view exists
  if exists (
    select 1 from information_schema.views
    where table_schema='public' and table_name='stripe_user_subscriptions'
  ) then
    -- ensure invoker rights on canonical view (RLS enforced on base tables)
    begin
      execute 'alter view public.stripe_user_subscriptions set (security_invoker = true)';
    exception when invalid_parameter_value or feature_not_supported then
      null;
    end;

    -- compat view mirrors stripe_user_subscriptions
    execute 'create or replace view public.subscriptions as
             select * from public.stripe_user_subscriptions';

    -- invoker rights on compat view too
    begin
      execute 'alter view public.subscriptions set (security_invoker = true)';
    exception when invalid_parameter_value or feature_not_supported then
      null;
    end;

    -- grants for reading via RLS-governed base tables
    execute 'grant select on public.subscriptions to anon, authenticated';
  else
    raise notice 'Skipped creating compat view: public.stripe_user_subscriptions not found.';
  end if;
end
$$ language plpgsql;

-- 5) Cron: schedule daily cleanup if the function exists (fixed quoting)
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.proname='cleanup_old_error_logs'
  ) then
    if exists (select 1 from pg_available_extensions where name='pg_cron') then
      -- create the job once
      if not exists (select 1 from cron.job where jobname='cleanup_error_logs_daily') then
        perform cron.schedule(
          'cleanup_error_logs_daily',
          '15 3 * * *',                      -- 03:15 UTC daily
          $cron$select public.cleanup_old_error_logs();$cron$
        );
      end if;
    end if;
  end if;
end
$$ language plpgsql;
