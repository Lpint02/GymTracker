-- ============================================================================
-- GymTracker — schema iniziale
--
-- Principi applicati ovunque in questo file:
--
--   1. Gli `id` sono uuid GENERATI DAL CLIENT (niente `default gen_random_uuid()`).
--      L'app scrive offline e deve conoscere l'id prima di aver visto il server.
--      È anche ciò che rende i retry idempotenti: ogni upsert colpisce una riga
--      per chiave primaria, quindi rigiocare la stessa operazione N volte
--      converge sempre alla stessa riga.
--
--   2. Il client NON invia mai `user_id`. La colonna ha `default auth.uid()` e
--      la policy RLS la inchioda con `with check`. Se il client potesse mandarla,
--      potrebbe mandarne una qualsiasi.
--
--   3. `user_id` è denormalizzato anche sulle tabelle figlie, così le policy RLS
--      restano `user_id = auth.uid()` senza subquery di join su workout_sets —
--      la tabella che cresce di più.
--
--   4. `date` è `date` (calendario locale dell'utente), `completed_at` è
--      `timestamptz` (istante UTC). Sono due tipi di tempo diversi e non vanno
--      mescolati: se `date` passasse per un timestamptz slitterebbe di un giorno
--      per i fusi a ovest di UTC, corrompendo in silenzio il calcolo dello
--      streak e l'ordine cronologico da cui dipendono i flag PR.
-- ============================================================================


-- ─── Allenamenti ────────────────────────────────────────────────────────────

create table if not exists public.workout_sessions (
  id            uuid primary key,
  user_id       uuid not null default auth.uid()
                  references auth.users(id) on delete cascade,
  date          date not null,
  muscle_groups text not null default '',
  completed_at  timestamptz not null,
  created_at    timestamptz not null default now()
);

create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, date desc, completed_at desc);


create table if not exists public.workout_exercises (
  id         uuid primary key,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id    uuid not null default auth.uid()
               references auth.users(id) on delete cascade,
  position   int  not null,
  name       text not null default ''
);

create index if not exists workout_exercises_session_idx
  on public.workout_exercises (session_id, position);


create table if not exists public.workout_sets (
  id          uuid primary key,
  exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  user_id     uuid not null default auth.uid()
                references auth.users(id) on delete cascade,
  position    int  not null,
  -- NULL corrisponde a "" nel tipo client (WorkoutSet.weight: number | "").
  -- La conversione vive in un solo posto lato client: src/lib/sync/mappers.ts.
  weight      numeric(6,2),
  reps        int,
  constraint workout_sets_not_empty check (weight is not null or reps is not null)
);

create index if not exists workout_sets_exercise_idx
  on public.workout_sets (exercise_id, position);


-- ─── Preferiti ──────────────────────────────────────────────────────────────
--
-- `label_key` / `name_key` sono colonne generate che fanno rispettare LATO
-- DATABASE la stessa convenzione trim+lowercase che il client già usa per il
-- dedupe. Un doppione non entra nemmeno se il client sbaglia.
--
-- Conseguenza da gestire nel motore di sync: un 23505 su un upsert di preferito
-- È UN SUCCESSO (il server è già d'accordo), non un errore permanente.

create table if not exists public.exercise_favorites (
  id         uuid primary key,
  user_id    uuid not null default auth.uid()
               references auth.users(id) on delete cascade,
  label      text not null,
  label_key  text generated always as (lower(btrim(label))) stored,
  created_at timestamptz not null default now(),
  unique (user_id, label_key)
);


-- Le "routine preferite" non sono una terza lista di preferiti: sono
-- l'evoluzione strutturata dei preferiti nome-allenamento. Il nome della
-- routine È il nome dell'allenamento (muscle_groups), e una routine con zero
-- item si comporta esattamente come una pill di oggi.
create table if not exists public.routine_favorites (
  id         uuid primary key,
  user_id    uuid not null default auth.uid()
               references auth.users(id) on delete cascade,
  name       text not null,
  name_key   text generated always as (lower(btrim(name))) stored,
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name_key)
);


create table if not exists public.routine_favorite_items (
  id            uuid primary key,
  routine_id    uuid not null references public.routine_favorites(id) on delete cascade,
  user_id       uuid not null default auth.uid()
                  references auth.users(id) on delete cascade,
  position      int  not null,
  exercise_name text not null
);

create index if not exists routine_favorite_items_routine_idx
  on public.routine_favorite_items (routine_id, position);


create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists routine_favorites_touch on public.routine_favorites;
create trigger routine_favorites_touch
  before update on public.routine_favorites
  for each row execute function public.touch_updated_at();


-- ============================================================================
-- RLS
--
-- ATTENZIONE: la RLS è DISATTIVATA di default sulle tabelle nuove, e `enable` è
-- un'istruzione SEPARATA dallo scrivere le policy. Una tabella con policy ma
-- senza `enable` è leggibile da chiunque abbia la anon key, che è pubblica.
-- Vedi in fondo al file la query di verifica: non assumere, controllare.
-- ============================================================================

alter table public.workout_sessions       enable row level security;
alter table public.workout_exercises      enable row level security;
alter table public.workout_sets           enable row level security;
alter table public.exercise_favorites     enable row level security;
alter table public.routine_favorites      enable row level security;
alter table public.routine_favorite_items enable row level security;


-- ─── Tabelle radice: proprietà diretta ──────────────────────────────────────

drop policy if exists own_select on public.workout_sessions;
drop policy if exists own_insert on public.workout_sessions;
drop policy if exists own_update on public.workout_sessions;
drop policy if exists own_delete on public.workout_sessions;

create policy own_select on public.workout_sessions
  for select using (user_id = auth.uid());
create policy own_insert on public.workout_sessions
  for insert with check (user_id = auth.uid());
create policy own_update on public.workout_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_delete on public.workout_sessions
  for delete using (user_id = auth.uid());


drop policy if exists own_select on public.exercise_favorites;
drop policy if exists own_insert on public.exercise_favorites;
drop policy if exists own_update on public.exercise_favorites;
drop policy if exists own_delete on public.exercise_favorites;

create policy own_select on public.exercise_favorites
  for select using (user_id = auth.uid());
create policy own_insert on public.exercise_favorites
  for insert with check (user_id = auth.uid());
create policy own_update on public.exercise_favorites
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_delete on public.exercise_favorites
  for delete using (user_id = auth.uid());


drop policy if exists own_select on public.routine_favorites;
drop policy if exists own_insert on public.routine_favorites;
drop policy if exists own_update on public.routine_favorites;
drop policy if exists own_delete on public.routine_favorites;

create policy own_select on public.routine_favorites
  for select using (user_id = auth.uid());
create policy own_insert on public.routine_favorites
  for insert with check (user_id = auth.uid());
create policy own_update on public.routine_favorites
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_delete on public.routine_favorites
  for delete using (user_id = auth.uid());


-- ─── Tabelle figlie: proprietà diretta + il genitore dev'essere tuo ─────────
--
-- Una foreign key garantisce che il `session_id` ESISTA, non che appartenga a
-- chi scrive. Senza la clausola `exists` un utente potrebbe agganciare un
-- esercizio alla sessione di un altro: non riuscirebbe a rileggerla, ma
-- sporcherebbe dati altrui.

drop policy if exists own_select on public.workout_exercises;
drop policy if exists own_insert on public.workout_exercises;
drop policy if exists own_update on public.workout_exercises;
drop policy if exists own_delete on public.workout_exercises;

create policy own_select on public.workout_exercises
  for select using (user_id = auth.uid());
create policy own_insert on public.workout_exercises
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.workout_sessions s
                where s.id = session_id and s.user_id = auth.uid())
  );
create policy own_update on public.workout_exercises
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workout_sessions s
                where s.id = session_id and s.user_id = auth.uid())
  );
create policy own_delete on public.workout_exercises
  for delete using (user_id = auth.uid());


drop policy if exists own_select on public.workout_sets;
drop policy if exists own_insert on public.workout_sets;
drop policy if exists own_update on public.workout_sets;
drop policy if exists own_delete on public.workout_sets;

create policy own_select on public.workout_sets
  for select using (user_id = auth.uid());
create policy own_insert on public.workout_sets
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.workout_exercises e
                where e.id = exercise_id and e.user_id = auth.uid())
  );
create policy own_update on public.workout_sets
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workout_exercises e
                where e.id = exercise_id and e.user_id = auth.uid())
  );
create policy own_delete on public.workout_sets
  for delete using (user_id = auth.uid());


drop policy if exists own_select on public.routine_favorite_items;
drop policy if exists own_insert on public.routine_favorite_items;
drop policy if exists own_update on public.routine_favorite_items;
drop policy if exists own_delete on public.routine_favorite_items;

create policy own_select on public.routine_favorite_items
  for select using (user_id = auth.uid());
create policy own_insert on public.routine_favorite_items
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.routine_favorites r
                where r.id = routine_id and r.user_id = auth.uid())
  );
create policy own_update on public.routine_favorite_items
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.routine_favorites r
                where r.id = routine_id and r.user_id = auth.uid())
  );
create policy own_delete on public.routine_favorite_items
  for delete using (user_id = auth.uid());


-- ============================================================================
-- RPC
--
-- Entrambe SECURITY INVOKER (il default esplicitato): girano con i permessi del
-- chiamante, quindi la RLS continua ad applicarsi riga per riga. Una
-- SECURITY DEFINER scavalcherebbe la RLS per definizione.
-- ============================================================================

-- Push: un allenamento = una transazione.
--
-- Spingere una sessione come tre chiamate PostgREST separate significherebbe
-- tre transazioni indipendenti: una tab uccisa fra la seconda e la terza
-- lascerebbe sul server una sessione con metà dei set — dato silenziosamente
-- sbagliato che nessun hook di derivazione lato client segnalerebbe.
--
-- Payload atteso (specchio di WorkoutSession, con i "" già convertiti in null
-- dal mapper lato client):
--   { "id": uuid, "date": "YYYY-MM-DD", "muscleGroups": text,
--     "completedAt": iso8601,
--     "exercises": [ { "id": uuid, "name": text,
--                      "sets": [ { "id": uuid, "weight": number|null,
--                                  "reps": number|null } ] } ] }
--
-- Le `position` non arrivano dal payload: sono derivate dall'ordine degli array
-- (`with ordinality`), che è l'unica fonte di verità sull'ordine lato client.
create or replace function public.sync_upsert_session(p_session jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  v_session_id uuid := (p_session->>'id')::uuid;
  v_uid        uuid := auth.uid();
  v_exercises  jsonb := coalesce(p_session->'exercises', '[]'::jsonb);
begin
  if v_uid is null then
    raise exception 'sync_upsert_session: nessun utente autenticato'
      using errcode = '28000';
  end if;

  insert into public.workout_sessions (id, user_id, date, muscle_groups, completed_at)
  values (
    v_session_id,
    v_uid,
    (p_session->>'date')::date,
    coalesce(p_session->>'muscleGroups', ''),
    coalesce((p_session->>'completedAt')::timestamptz, now())
  )
  on conflict (id) do update
    set date          = excluded.date,
        muscle_groups = excluded.muscle_groups,
        completed_at  = excluded.completed_at;

  -- Esercizi spariti dal payload (il cascade porta via i loro set).
  delete from public.workout_exercises e
  where e.session_id = v_session_id
    and not exists (
      select 1 from jsonb_array_elements(v_exercises) ex
      where (ex->>'id')::uuid = e.id
    );

  insert into public.workout_exercises (id, session_id, user_id, position, name)
  select (t.ex->>'id')::uuid,
         v_session_id,
         v_uid,
         (t.ord - 1)::int,
         coalesce(t.ex->>'name', '')
  from jsonb_array_elements(v_exercises) with ordinality as t(ex, ord)
  on conflict (id) do update
    set session_id = excluded.session_id,
        position   = excluded.position,
        name       = excluded.name;

  -- Set spariti dal payload.
  delete from public.workout_sets s
  using public.workout_exercises e
  where s.exercise_id = e.id
    and e.session_id = v_session_id
    and not exists (
      select 1
      from jsonb_array_elements(v_exercises) ex,
           jsonb_array_elements(coalesce(ex->'sets', '[]'::jsonb)) st
      where (st->>'id')::uuid = s.id
    );

  insert into public.workout_sets (id, exercise_id, user_id, position, weight, reps)
  select (t2.st->>'id')::uuid,
         (t1.ex->>'id')::uuid,
         v_uid,
         (t2.sord - 1)::int,
         -- nullif difensivo: se un "" del client sfuggisse al mapper,
         -- diventa NULL qui invece di far esplodere il cast con un 22P02.
         nullif(t2.st->>'weight', '')::numeric,
         nullif(t2.st->>'reps', '')::int
  from jsonb_array_elements(v_exercises) as t1(ex),
       jsonb_array_elements(coalesce(t1.ex->'sets', '[]'::jsonb))
         with ordinality as t2(st, sord)
  on conflict (id) do update
    set exercise_id = excluded.exercise_id,
        position    = excluded.position,
        weight      = excluded.weight,
        reps        = excluded.reps;
end;
$$;


-- Pull: tutto l'utente in un round-trip, già nella forma degli object store
-- IndexedDB — nessun join lato client su tre result set separati.
--
-- NOTA: `weight`/`reps` tornano come JSON null, NON come "". La conversione
-- null -> "" resta responsabilità di src/lib/sync/mappers.ts, così quella
-- traduzione vive in un posto solo in tutto il progetto.
--
-- Il filtro su auth.uid() è ridondante rispetto alla RLS (che si applica
-- comunque, essendo SECURITY INVOKER): è lì per rendere l'intento leggibile.
create or replace function public.export_user_data()
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(

    'sessions', coalesce((
      select jsonb_agg(x.obj order by x.date desc, x.completed_at desc, x.id)
      from (
        select ws.id, ws.date, ws.completed_at,
               jsonb_build_object(
                 'id',           ws.id,
                 'date',         to_char(ws.date, 'YYYY-MM-DD'),
                 'muscleGroups', ws.muscle_groups,
                 'completedAt',  to_char(ws.completed_at at time zone 'UTC',
                                         'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                 'exercises',    coalesce(ex.arr, '[]'::jsonb)
               ) as obj
        from public.workout_sessions ws
        left join lateral (
          select jsonb_agg(
                   jsonb_build_object(
                     'id',   we.id,
                     'name', we.name,
                     'sets', coalesce(st.arr, '[]'::jsonb)
                   ) order by we.position
                 ) as arr
          from public.workout_exercises we
          left join lateral (
            select jsonb_agg(
                     jsonb_build_object(
                       'id',     wst.id,
                       'weight', wst.weight,
                       'reps',   wst.reps
                     ) order by wst.position
                   ) as arr
            from public.workout_sets wst
            where wst.exercise_id = we.id
          ) st on true
          where we.session_id = ws.id
        ) ex on true
        where ws.user_id = auth.uid()
      ) x
    ), '[]'::jsonb),

    'exerciseFavorites', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',        ef.id,
                 'label',     ef.label,
                 'createdAt', to_char(ef.created_at at time zone 'UTC',
                                      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
               ) order by ef.created_at desc
             )
      from public.exercise_favorites ef
      where ef.user_id = auth.uid()
    ), '[]'::jsonb),

    'routines', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',            rf.id,
                 'name',          rf.name,
                 'position',      rf.position,
                 'exerciseNames', coalesce(it.arr, '[]'::jsonb),
                 'createdAt',     to_char(rf.created_at at time zone 'UTC',
                                          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                 'updatedAt',     to_char(rf.updated_at at time zone 'UTC',
                                          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
               ) order by rf.position, rf.created_at desc
             )
      from public.routine_favorites rf
      left join lateral (
        select jsonb_agg(rfi.exercise_name order by rfi.position) as arr
        from public.routine_favorite_items rfi
        where rfi.routine_id = rf.id
      ) it on true
      where rf.user_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;


revoke all on function public.sync_upsert_session(jsonb) from public, anon;
revoke all on function public.export_user_data()        from public, anon;
grant execute on function public.sync_upsert_session(jsonb) to authenticated;
grant execute on function public.export_user_data()        to authenticated;


-- ============================================================================
-- Verifica di accettazione — eseguire a mano dopo la migrazione.
-- Il vincolo "RLS su ogni tabella, nessuna eccezione" va CONTROLLATO, non assunto.
--
--   select tablename from pg_tables
--   where schemaname = 'public' and rowsecurity = false;
--   -- deve restituire zero righe
--
-- E, con due utenti di prova, verificare che il secondo non veda nulla del primo:
--   select count(*) from public.workout_sessions;   -- 0 per l'altro utente
-- ============================================================================
