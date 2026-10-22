create table if not exists fl_vapid (
  id text primary key,
  public_key text not null,
  private_key text not null
);

create table if not exists fl_push (
  endpoint text primary key,
  employee_id text not null,
  p256dh text not null,
  auth text not null
);
