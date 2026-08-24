-- ============================================================================
-- RPC per le routine preferite.
--
-- Stessa forma di sync_upsert_session e per la stessa ragione: una routine è
-- una riga più N item ordinati, e spingerli come chiamate PostgREST separate
-- sarebbe una transazione ciascuna. Una tab uccisa a metà lascerebbe una
-- routine con solo una parte dei suoi esercizi — e a differenza di un errore
-- rumoroso, questo si nota solo quando la si avvia e mancano dei pezzi.
--
-- Un'operazione = un round-trip = una transazione = un esito atomico, che è
-- esattamente la forma che l'outbox vuole per rendere i retry banalmente
-- corretti.
--
-- Le tabelle e le policy RLS sono già in 0001_init.sql: qui non si crea nulla
-- di nuovo, si aggiunge solo la funzione.
-- ============================================================================

create or replace function public.sync_upsert_routine(p_routine jsonb)
returns void
language plpgsql
security invoker          -- la RLS resta attiva, come per le sessioni
as $$
declare
  v_routine_id uuid  := (p_routine->>'id')::uuid;
  v_uid        uuid  := auth.uid();
  v_names      jsonb := coalesce(p_routine->'exerciseNames', '[]'::jsonb);
begin
  if v_uid is null then
    raise exception 'sync_upsert_routine: nessun utente autenticato'
      using errcode = '28000';
  end if;

  insert into public.routine_favorites (id, user_id, name, position)
  values (
    v_routine_id,
    v_uid,
    coalesce(p_routine->>'name', ''),
    coalesce((p_routine->>'position')::int, 0)
  )
  on conflict (id) do update
    set name     = excluded.name,
        position = excluded.position;

  -- Gli item non hanno identità propria: la lista è il valore. Sostituirla in
  -- blocco è più semplice e più corretto di un diff, e resta idempotente.
  delete from public.routine_favorite_items where routine_id = v_routine_id;

  insert into public.routine_favorite_items (id, routine_id, user_id, position, exercise_name)
  select gen_random_uuid(),
         v_routine_id,
         v_uid,
         (t.ord - 1)::int,
         t.name #>> '{}'
  from jsonb_array_elements(v_names) with ordinality as t(name, ord);
end;
$$;

revoke all on function public.sync_upsert_routine(jsonb) from public, anon;
grant execute on function public.sync_upsert_routine(jsonb) to authenticated;
