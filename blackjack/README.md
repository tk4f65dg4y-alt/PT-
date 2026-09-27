# Blackjack Table

A live multiplayer blackjack table for up to 7 friends. Create a table, share the
5-character room code (or the link), pick a seat, and play a real 4-deck shoe
together in real time — no accounts needed.

This is a standalone app living in `/blackjack`, independent of the rest of this
repository.

## Rules

- **4-deck shoe**, reshuffled automatically once fewer than 52 cards remain.
- Dealer **stands on soft 17**.
- **Blackjack pays 3:2**.
- **Double down** on any first two cards (including after a split).
- **Split** up to 3 times (4 hands total); split aces get exactly one card each
  and no further action, per standard casino rules.
- **Insurance** is offered when the dealer shows an Ace (pays 2:1); the dealer
  peeks for blackjack on any Ace or ten-value up card.
- Everyone starts with 1000 chips per table. Table limits: 5–500 per bet.
- A betting round has a 20s timer (rounds start early once everyone's bet is
  in); each player turn has its own 20s timer with auto-stand on timeout.
- **Side bets**: Perfect Pairs (your first two cards) and 21+3 (your two cards
  + the dealer's up card, scored as 3-card poker), 5–100 per side bet, resolved
  right after the deal. Standard paytables (mixed/colored/perfect pair
  5:1/10:1/30:1; flush/straight/trips/straight flush/suited trips
  5:1/10:1/30:1/40:1/100:1).

## Casino touches

- **Cast your own dealer**: any player can tap the dealer's seat to upload a
  friend's photo (resized client-side) and give them a name — everyone at the
  table sees it. Stored in memory per room only, not persisted.
- A visible 4-deck shoe (a stack of face-down cards in a wooden holder) that
  visibly shrinks as the shoe is dealt down, felt-table styling, and the
  standard "BLACKJACK PAYS 3 TO 2 / DEALER MUST STAND ON 17..." felt text.
- Built mobile-first: on narrow screens the seat layout switches to a
  two-column grid (the fanned table needs real width to avoid seats
  overlapping), and the bet/action controls are pinned to the bottom of the
  screen so Hit/Stand/Double/Split are always reachable without scrolling.

## How it works

- **Server**: Node.js, Express, TypeScript, and the `ws` WebSocket library.
  Game state (shoe, seats, bets, hands, timers) lives entirely in memory per
  room — there's no database, since a table is meant to be a disposable,
  ephemeral game for a group of friends.
- **Web**: React, TypeScript, Vite. No UI framework — hand-rolled CSS for a
  felt-table look.
- A room is identified by a short code. Joining opens a WebSocket
  (`/ws?code=XXXXX`); all table state broadcasts to every connected player.
  Each browser gets a private reconnect token (stored in `localStorage`) so a
  refresh or dropped connection rejoins the same seat, chips, and hand — seats
  are freed automatically if a player doesn't come back within 5 minutes.
- Single deployable service: the server serves the built React app and the
  `/api/*` + `/ws` routes on one port.

## Local development

```bash
cd blackjack/server
npm install
npm run dev              # starts the API + WebSocket server on :3210

# in another terminal
cd blackjack/web
npm install
npm run dev               # starts the Vite dev server on :5173, proxying /api and /ws to :3210
```

Open `http://localhost:5173`, create a table, and open the link in more tabs
(or send it to friends) to fill seats.

## Deploying

```bash
npm run build   # from /blackjack — builds the web app then the server
npm start       # serves the built frontend + API/WS from one process/port
```

Set `PORT` to choose the listening port (defaults to `3210`). No database or
other environment variables are required.
