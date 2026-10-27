-- Run once in the Supabase SQL editor. No service-role key is used by the web app.
create table if not exists public.learning_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint valid_progress_object check (jsonb_typeof(progress) = 'object'),
  constraint bounded_progress_size check (octet_length(progress::text) <= 5000000)
);
alter table public.learning_progress enable row level security;
revoke all on public.learning_progress from anon;
grant select, insert, update, delete on public.learning_progress to authenticated;
drop policy if exists "Read own learning progress" on public.learning_progress;
create policy "Read own learning progress" on public.learning_progress for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own learning progress" on public.learning_progress;
create policy "Insert own learning progress" on public.learning_progress for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own learning progress" on public.learning_progress;
create policy "Update own learning progress" on public.learning_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Delete own learning progress" on public.learning_progress;
create policy "Delete own learning progress" on public.learning_progress for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.save_learning_progress(p_progress jsonb, p_expected_revision bigint)
returns table(revision bigint, updated_at timestamptz)
language plpgsql security invoker set search_path = public
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if jsonb_typeof(p_progress) <> 'object' or p_progress->>'version' is distinct from '2' then
    raise exception 'Invalid progress document' using errcode='22023';
  end if;
  if p_expected_revision < 0 then raise exception 'Invalid revision' using errcode='22023'; end if;
  if p_expected_revision = 0 then
    return query insert into public.learning_progress as lp(user_id, progress, revision)
      values(current_user_id, p_progress, 1)
      on conflict (user_id) do nothing
      returning lp.revision, lp.updated_at;
  else
    return query update public.learning_progress as lp
      set progress=p_progress, revision=lp.revision+1, updated_at=clock_timestamp()
      where lp.user_id=current_user_id and lp.revision=p_expected_revision
      returning lp.revision, lp.updated_at;
  end if;
  if not found then raise exception 'Progress revision conflict' using errcode='40001'; end if;
end;
$$;
revoke all on function public.save_learning_progress(jsonb,bigint) from public, anon;
grant execute on function public.save_learning_progress(jsonb,bigint) to authenticated;
