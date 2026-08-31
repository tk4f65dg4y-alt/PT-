# PT Coach

A workout tracking app for personal trainers. The trainer (admin) creates
clients, builds workout plans (weeks → days → exercises) by picking from a
built-in exercise library or typing their own, and assigns them to a client
or a pair of clients training together. Clients log in (installable as an
app on their phone), see their plan as a list or a calendar, tick off
exercises as they complete them, use a built-in rest timer and workout
stopwatch, message their trainer, and build up a streak with badges. The
trainer's dashboard shows who's done what and when, per-member progress and
streaks, a chat thread per client/pair, and a one-tap "nudge" push
notification.

## Stack

- **Server**: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT auth (httpOnly cookie),
  `web-push` for browser push notifications, `node-cron` for the daily inactivity check.
- **Web**: React, TypeScript, Vite, React Router. Installable PWA (manifest + service worker).
- Single deployable service: the server serves the built React app and the `/api/*` routes.

## How it's modeled

- A **Group** is the unit a plan is assigned to — a solo client is a group of one,
  a pair is a group of two. Both members of a pair see the same assigned plan,
  but each ticks off their own progress independently.
- A **Plan** has **Weeks** → **Days** → **Exercises** (name, sets, reps, weight, rest seconds),
  each optionally linked to an **ExerciseLibraryItem** (a seeded catalog of ~50 common
  exercises, each tagged with a movement pattern used for its animated icon and a form cue).
- A **Completion** row records that a specific client finished a specific exercise, and when.
- A **WorkoutSession** records how long a client spent on a given day's workout (via the built-in stopwatch).
- A **Message** thread is shared per group (so a pair and the trainer see the same conversation).
- A **PushSubscription** stores a device's Web Push subscription, used for manual "nudge"
  pushes, new-message pushes, and a daily automatic nudge to clients inactive 40+ hours.

## Feature notes

- **Exercise "GIFs"**: rather than licensed stock footage, each exercise is tagged with a
  broad movement pattern (squat, hinge, push, pull, lunge, core, carry, cardio, mobility)
  and gets a small looping animated icon for that pattern, plus a text form cue — original,
  no licensing risk, works offline.
- **Calendar view**: only available once a plan has a start date — days are assumed to run
  daily from that date (no explicit rest-day gaps yet).
- **Push notifications**: real Web Push (no third-party service/API key — just a
  self-generated VAPID key pair). A client or trainer taps "Enable" once per device to opt
  in. Needs `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` set (see below) — silently disabled otherwise.
- **Streaks & badges**: computed on the fly from completion/session timestamps, not stored —
  always accurate, nothing to migrate if the badge list changes.

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
`ADMIN_PASSWORD`, `ADMIN_NAME`, and optionally `VAPID_PUBLIC_KEY` /
`VAPID_PRIVATE_KEY` / `VAPID_CONTACT_EMAIL` for push notifications (generate
a key pair with `npx web-push generate-vapid-keys`). The root `npm run build`
builds both the web app and the server; `npm start` runs `prisma migrate
deploy` then starts the server, which serves the built frontend and the API
from one process/port.
