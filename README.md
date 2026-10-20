# Fieldline

Field workflow app for Legacy Protected Services. Crews clock in, run jobs, upload photos, and chat. One shared board. PIN gate, not email login.

## Run it

```bash
npm install
npm run dev
```

The dev server listens on port 8080. With no database URL it uses a local database that resets when the process restarts.

## Remote database

Set `DATABASE_URL` to a Postgres connection string (Neon pooled URL). Do not commit it.

`npm run build` applies `migrations/`. That creates `fl_board` and `fl_session`. A fresh database starts with one admin, name Owner, PIN `6263`.

That database is empty of jobs until people use the app. It is not a copy of any other host's data unless you point both at the same connection string.

## Notes for a takeover

- Auth is off on purpose. Access is the 4-digit PIN. Admins add people and assign their codes from the People screen.
- Board changes go through `src/lib/board-ops.ts`. Client and server use the same reducer.
- Server functions live in `src/lib/fieldline.functions.ts`.
