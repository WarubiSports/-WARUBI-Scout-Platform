# WARUBI Scout Platform

## Project Overview
Scouting CRM for Warubi Sports. Scouts manage player pipelines, send outreach, track events, and earn XP.

## Tech Stack
- **Frontend:** Vite + React + TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, REST API)
- **Styling:** Tailwind CSS with custom `scout-*` color tokens
- **Deploy:** Vercel (`vercel --prod`)
- **Live URL:** https://warubi-scout-platform.vercel.app

## Key Directories
- `/components` - React components (Dashboard, OutreachTab, ProfileTab, etc.)
- `/hooks` - Custom hooks (useProspects, useEvents, useOutreach)
- `/services` - API services (geminiService, trialService, supabase)
- `/contexts` - AuthContext, ScoutContext
- `/lib` - Supabase client, database types

## Player Pipeline Stages
Lead → Contacted → Interested → Offered → Placed

## Important Logic
- **ITP Trial Sync:** Only syncs to ITP when player is OFFERED AND `interestedProgram` contains "ITP" (see `App.tsx:handleUpdatePlayer`)
- **XP System:** Points awarded for player adds, placements, events (see `constants.ts:SCOUT_POINTS`)
- **AI Features:** Gemini-powered evaluation, outreach generation, bulk import

## Related Projects
- **ITP Staff App:** `~/projects/ITP-Staff-App` - Staff management for ITP trials
- **ITP Player App:** `~/projects/ITP-Player-App` - Player-facing trial app
- **ExposureEngine V2:** `~/projects/ExposureEngineV2` - Public recruiting visibility tool

## Test Credentials
- Admin: max.bisinger@warubi-sports.com / ITP2024

## Architecture Gotchas

### Component Definition Anti-Pattern
Never define components (Input, Select, etc.) inside other components - causes re-render on every state change, losing input focus. Keep form components outside or use `useMemo`.

### Stale Closures in Callbacks
Avoid capturing state arrays (like `prospects`) in callbacks passed to child components. Instead, call update functions directly:
```tsx
// BAD: stale closure
onStatusChange={(id, status) => {
  const p = prospects.find(x => x.id === id);
  if (p) handleUpdate({ ...p, status });
}}

// GOOD: direct update
onStatusChange={(id, status) => updateProspect(id, { status })}
```

### Supabase REST vs Realtime
Realtime WebSocket is disabled (`eventsPerSecond: 0`). All CRUD uses REST API via `supabaseRest` helpers in `lib/supabase.ts`. Local state updates happen immediately in the CRUD functions.

### Status Mapping
Frontend uses `PlayerStatus.LEAD` ("Lead"), database uses lowercase `'lead'`. Mapping functions in `hooks/useProspects.ts`: `statusToDb()` and `statusFromDb()`.

## Database Notes
- Table: `scout_prospects` - main player data
- Table: `scout_outreach_logs` - message history
- Table: `scouts` - scout profiles and XP
- RLS enabled - scouts only see their own data
