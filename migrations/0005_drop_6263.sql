-- 2369 is the only master code. Clear 6263 so that number can be given to someone else.
delete from fl_session
where employee_id in (
  select e->>'id'
  from fl_board b, jsonb_array_elements(b.state->'employees') e
  where b.id = 'main' and e->>'pin' = '6263'
);

update fl_board
set state = jsonb_set(
      state,
      '{employees}',
      (
        select jsonb_agg(
          case
            when e->>'pin' = '6263' then jsonb_set(e, '{pin}', '""'::jsonb)
            else e
          end
        )
        from jsonb_array_elements(state->'employees') e
      )
    ),
    version = version + 1
where id = 'main'
  and exists (
    select 1
    from jsonb_array_elements(state->'employees') e
    where e->>'pin' = '6263'
  );
