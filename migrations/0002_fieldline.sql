create table if not exists fl_board (
  id text primary key,
  version integer not null default 1,
  state jsonb not null
);

create table if not exists fl_session (
  token text primary key,
  employee_id text not null,
  created_at timestamptz not null default now()
);

insert into fl_board (id, version, state)
values (
  'main',
  1,
  '{"employees":[{"id":"e_owner","name":"Owner","role":"admin","trade":"Master","initials":"OW","phone":"","pin":"6263"}],"projects":[],"tasks":[],"timeEntries":[],"chats":[],"messages":[],"notices":[]}'::jsonb
)
on conflict (id) do nothing;
