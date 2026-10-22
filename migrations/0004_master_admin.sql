-- Protected master admin. Approves new admin accounts. Cannot be deleted.
update fl_board
set state = jsonb_set(
      state,
      '{employees}',
      coalesce(state->'employees', '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'id', 'e_vince',
          'name', 'VinceNorris',
          'role', 'admin',
          'trade', 'Master',
          'initials', 'VN',
          'phone', '',
          'address', '',
          'pin', '2369',
          'status', 'active'
        )
      )
    ),
    version = version + 1
where id = 'main'
  and not exists (
    select 1
    from jsonb_array_elements(state->'employees') e
    where e->>'id' = 'e_vince'
       or e->>'pin' = '2369'
       or e->>'name' = 'VinceNorris'
  );
