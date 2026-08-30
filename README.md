# PT Coach

A workout tracking app for personal trainers. The trainer (admin) creates
clients, builds workout plans (weeks → days → exercises), and assigns them
to a client or a pair of clients training together. Clients log in, see
their plan, tick off exercises as they complete them, and use a built-in
rest timer and workout stopwatch. The trainer's dashboard shows who's done
what and when.

## Stack

- **Server**: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT auth (httpOnly cookie)
- **Web**: React, TypeScript, Vite, React Router
- Single deployable service: the server serves the built React app and the `/api/*` routes.

## How it's modeled

- A **Group** is the unit a plan is assigned to — a solo client is a group of one,
  a pair is a group of two. Both members of a pair see the same assigned plan,
  but each ticks off their own progress independently.
- A **Plan** has **Weeks** → **Days** → **Exercises** (name, sets, reps, weight, rest seconds).
- A **Completion** row records that a specific client finished a specific exercise, and when.
- A **WorkoutSession** records how long a client spent on a given day's workout (via the built-in stopwatch).

## Local development

Requires a local Postgres database (or point `DATABASE_URL` at any Postgres instance).

```bash
cd server
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npx prisma migrate deploy
npm run dev             # starts the API on :3000

# in another terminal
cd web
npm install
npm run dev              # starts the Vite dev server on :5173, proxying /api to :3000
```

The first time the server boots with no trainer account yet in the database,
it creates one from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (and optional `ADMIN_NAME`).
That's how you log in as the trainer/admin.

## Deploying

Set these environment variables on the server service: `DATABASE_URL` (from
your Postgres service), `JWT_SECRET` (a long random string), `ADMIN_EMAIL`,
`ADMIN_PASSWORD`, `ADMIN_NAME`. The root `npm run build` builds both the web
app and the server; `npm start` runs `prisma migrate deploy` then starts the
server, which serves the built frontend and the API from one process/port.
