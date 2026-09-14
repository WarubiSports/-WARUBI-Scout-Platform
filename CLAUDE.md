# WARUBI Scout Platform

## Quick Reference

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm test         # Vitest (single run; test:watch for watch mode)
vercel --prod    # Deploy to Vercel
```

## Test Accounts
- Admin: max.bisinger@warubi-sports.com / ITP2024

---

## Project Overview
Scouting CRM for Warubi Sports. Scouts manage player pipelines, send outreach, and track events.

## Tech Stack
- **Frontend:** Vite + React + TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, REST API)
- **Styling:** Tailwind CSS with custom `scout-*` color tokens
- **Deploy:** Vercel (`vercel --prod`)
- **Live URL:** https://scout-buddy.vercel.app

## Key Directories
- `/components` - React components (AdminDashboard, OutreachTab, EventHub, plus `admin/`, `screens/`, `routes/` subdirs)
- `/hooks` - Custom hooks (useProspects, useEvents, useOutreach)
- `/services` - API services (geminiService, trialService, supabase)
- `/contexts` - AuthContext, ScoutContext
- `/lib` - Supabase client, database types

## Player Pipeline Stages
Lead → Contacted → Request Trial → Offered → Placed (+ Archived)

Send Contract stage and the direct-sign sync path were removed 2026-03-22 (commit `c8d8401`, replaced by Contact Requested). DB keeps legacy status values (`send_contract`, `contacted`, etc.) mapped in `statusFromDb()`.

## Important Logic
- **ITP Trial Sync:** Moving to REQUEST_TRIAL triggers `sendProspectToTrial()` with trial dates. All status-transition side effects (placement celebration, trial request) live in ONE place: `handleStatusTransition()` in `hooks/useItpSync.ts`, called from both App.tsx paths (`handleUpdatePlayer` detail form + `onStatusChange` board dropdown). New transition side effects go in that hook, never inline in App.tsx — the logic used to be duplicated across both paths and they drifted.
- **TrialRequestModal:** Replaces old `PathwaySelectionModal`. Shows date picker when moving to Request Trial. Located at `components/TrialRequestModal.tsx`.
- **AI Features:** Gemini-powered evaluation, outreach generation, bulk import

## Related Projects
- **ITP Staff App:** `~/projects/ITP-Staff-App` - Staff management for ITP trials
- **ITP Player App:** `~/projects/ITP-Player-App` - Player-facing trial app

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
- Table: `scouts` - scout profiles
- RLS enabled - scouts only see their own data
