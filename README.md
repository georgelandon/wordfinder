# Boggle Party

Boggle Party is a static-hosted multiplayer word game built for living-room play:

- The shared board, timer, lobby state, and results live on a TV-friendly display route.
- Each player joins from their own phone and uses it as a touch-first controller.
- GitHub Pages hosts the frontend.
- Supabase handles auth, Postgres, realtime, migrations, and trusted scoring flows.

## Folder Structure

```text
.
+-- .github/workflows/deploy.yml
+-- scripts/sync-enable-dictionary.mjs
+-- shared/
|   +-- dictionary.ts
|   `-- generated/dictionary-data.ts
|   +-- types.ts
|   `-- game/
|       +-- board.ts
|       +-- constants.ts
|       +-- random.ts
|       +-- scoring.ts
|       +-- session.ts
|       +-- trie.ts
|       `-- validation.ts
+-- src/
|   +-- app/router.tsx
|   +-- components/
|   +-- hooks/
|   +-- lib/
|   +-- pages/
|   +-- store/
|   +-- styles/index.css
|   `-- test/
+-- supabase/
|   +-- config.toml
|   +-- migrations/202604062210_initial.sql
|   `-- functions/
|       +-- _shared/
|       |   +-- dictionary.ts
|       |   `-- generated/dictionary-data.ts
|       +-- create-or-join-room/
|       +-- start-round/
|       +-- end-round-and-score/
|       `-- set-player-state/
+-- .env.example
+-- package.json
`-- vite.config.ts
```

## Routes

- `/` landing page
- `/room` create or join a room
- `/display/:roomCode` TV/shared display
- `/controller/:roomCode` phone controller for players and host
- `/results/:roomCode/:roundId` latest room summary view

The app uses `HashRouter`, so GitHub Pages links resolve as `#/controller/ABCDE`, `#/display/ABCDE`, and so on.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Zustand
- Supabase JS
- Supabase Postgres + Realtime + Edge Functions
- `react-qr-code`
- Vitest

## Supabase Schema

The migration creates:

- `rooms`
- `players`
- `rounds`
- `submissions`
- `scored_words`
- `round_totals`
- `session_totals`

Important room/session fields:

- `rooms.host_player_id`: current host
- `rooms.active_round_id`: active round pointer
- `rooms.current_round_number`: monotonically increasing session round count
- `rounds.seed` and `rounds.board`: deterministic round board state for fairness/debugging
- `session_totals`: cumulative scoreboard across many rounds

## RLS Strategy

This project uses anonymous Supabase auth for guest play.

- All authenticated users can read `rooms`, `players`, `rounds`, `round_totals`, `session_totals`, and `scored_words`.
- Authenticated users can insert/update only their own `submissions`.
- Trusted state transitions happen in Edge Functions and SQL RPCs.
- `create_or_join_room` and `set_player_state` run as `SECURITY DEFINER`.
- Host reassignment is enforced in the database through `sync_room_host(...)` plus player activity/heartbeat updates.

Tradeoff:

- `submissions` are readable by authenticated clients so the shared display can show live submission counts without an extra aggregate table.
- If you want stricter privacy later, move submission counts into a dedicated public round-stats table and tighten the `submissions` select policy again.

## Edge Functions

- `create-or-join-room`
  - Joins or restores the player row
  - Assigns the first player as host
- `create-room`
  - Creates an empty room for the TV/display route
  - Leaves host assignment empty until the first phone joins
- `set-player-state`
  - Heartbeat/ready updates
  - Marks stale players disconnected
  - Reassigns host when needed
- `start-round`
  - Validates host authority
  - Generates deterministic seed + board
  - Creates countdown/round timing anchors
- `end-round-and-score`
  - Validates timing/authority
  - Scores on the server with dictionary + board-path validation
  - Publishes round totals and session totals

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a new Supabase project, then copy:

- Project URL
- Anon public key

### 3. Enable anonymous auth

In the Supabase dashboard:

1. Open `Authentication`
2. Open `Providers`
3. Enable `Anonymous Sign-Ins`

### 4. Configure frontend env vars

Copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_BASE_PATH=/
VITE_DEFAULT_ROUND_DURATION=120
```

### 5. Link Supabase locally

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 6. Apply the migration

```bash
supabase db push
```

### 7. Deploy Edge Functions

```bash
supabase functions deploy create-room
supabase functions deploy create-or-join-room
supabase functions deploy set-player-state
supabase functions deploy start-round
supabase functions deploy end-round-and-score
```

If your project does not automatically expose the standard function env vars, set:

```bash
supabase secrets set SUPABASE_URL=YOUR_URL
supabase secrets set SUPABASE_ANON_KEY=YOUR_ANON_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### 8. Run the app

```bash
npm run dev
```

## GitHub Pages Deployment

This repo is set up for GitHub Pages with a GitHub Actions workflow.

### Required GitHub repository secrets

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Default base path behavior

The workflow builds with:

```text
VITE_BASE_PATH=/${REPOSITORY_NAME}/
```

That is the correct default for project pages such as:

```text
https://username.github.io/repository-name/
```

If you are deploying to the root user/org site like:

```text
https://username.github.io/
```

change the workflow env value to:

```text
VITE_BASE_PATH=/
```

### Enable Pages

In GitHub:

1. Open `Settings`
2. Open `Pages`
3. Set source to `GitHub Actions`

Push to `main` and the workflow will publish `dist/`.

## How The Session Works

1. `Create Room` opens the display route without creating a player.
2. The display route shows room code, QR onboarding, player list, and ready state.
3. The first phone/player to join becomes host automatically.
4. Round timing uses server timestamps (`starts_at`, `ends_at`) so all devices stay aligned.
5. Phones submit unique words with debounced writes.
6. When time expires, clients safely race to trigger `end-round-and-score`; the flow is idempotent.
7. Results publish to all clients via Supabase Realtime and the room remains active for the next round.

## Tests

Run:

```bash
npm run test:run
```

Covered logic:

- deterministic seeded board generation
- filtered dictionary loading and blocklist behavior
- board path validation
- `Qu` tile behavior
- scoring rules
- duplicate handling
- host assignment and failover
- cumulative session scoring
- round sequencing guardrails

## Dictionary

- Server-side round scoring uses the same filtered list from `supabase/functions/_shared/dictionary.ts`.
- The generated `ENABLE1` source is also available in `shared/generated/dictionary-data.ts` for shared tooling and tests.
- The generated dictionary removes exact single-token matches from the `LDNOOBW` English profanity list. This is an inference for "remove vulgar words" and can be tuned later with a manual allowlist if you want a looser or stricter filter.
- Refresh the generated files with:

```bash
npm run dictionary:sync
```

## Notes

- The TV experience is browser-based by design, so Apple TV support means casting/AirPlay/mirroring a large-screen browser session rather than a native tvOS app.
