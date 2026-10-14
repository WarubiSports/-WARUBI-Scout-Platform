# Prepared ITP AI authorization repair

The deployed ITP `gemini-proxy` v20 accepts a public anon JWT at the gateway but never checks for an actual user. An unsupported-operation public-key probe reached its handler without invoking a model. This branch adds verified user and staff/scout approval checks before reading an AI request.

The server file starts from the source returned by the provider for ITP project `umblyhwumtadlvgccdwg`, version 20, reported bundle hash `7b735341b66f8902fd8ec7f115329762077a4c4dc91982c3e850fdbd90cfee8b`. The downloaded index source SHA256 is `16e6be515118cc1f0c0ec30de642a5c7758e968546fa8d568d523066a8a20eeb`. The existing repository copy differs from that deployed source. All eleven deployed operations are retained, including `bulkGenerateOutreach`.

Authorization uses `/auth/v1/user`, then server-controlled admin metadata or existing `approved_staff` / `check_email_approved` records. It never trusts payload identities, user metadata, or `profiles.role`, and needs no service-role key. Runtime configuration is `SUPABASE_URL` plus `SUPABASE_PUBLISHABLE_KEY` (preferred) or the existing legacy `SUPABASE_ANON_KEY`. Legacy-key retirement requires configuring and verifying the modern public key first.

The companion client is based on main e49ee829671266cf93a6cf0826d0cc325c9e0394, which matches the live browser bundle’s public-key bearer logic and bulk outreach feature. It sends its session bearer token, reacquires it on retry, and does not retry authentication/approval failures. Existing fallback behavior remains available. Local client usage counters still run before access checks; they are not a spending control.

Bulk outreach stops after the first access denial or missing session instead of making more denied requests for subsequent batches. Server operation failures return a generic message and do not log raw model exceptions.

Closed tests (Node 24.11.1 or newer):

```sh
node supabase/functions/gemini-proxy/authorization.test.mjs
node services/geminiService.auth.test.mjs
```

The full handler uses mocked Auth, approval HTTP responses and Google models. The client test runs the real service with mocked Auth, HTTP and toast dependencies. No live model, database change or email send is part of these tests.

The current suite passes 35 checks (27 handler, 8 client), and Deno type checking passes. The added bulk denial regression first reproduced three requests for 21 players, then passed with one request after the repair.

## Release state

Prepared only. This branch does not deploy the Edge Function. The deployed function currently has `verify_jwt=true`; this setting is retained. Production release remains blocked on real fixture authorization checks, server spending/payload limits, and deployment control / ownership of the previously untracked live function source. Public static-code checks confirm warubi-scout-platform.vercel.app is live, targets ITP, and uses the public anon key as its bearer. The current Vercel team cannot inspect this deployment. Separate ITP database-permission work is tracked in ITP Staff PR148; this branch applies no migration.

Claude Sonnet 5.5 reviewed the preparation at 2026-10-14T04:15Z (Oct 13 PDT): GO WITH FOLDS for preparation, NO-GO for release. The review's metadata/RPC/type/case questions were answered by native read-only checks; malformed-token status handling and client authorization retry findings were folded. No release approval is implied.

Claude's aligned-main read at 2026-10-14T05:01Z returned GO WITH FOLDS for this draft and NO-GO for release. The reviewer read the implementation but did not run tests or query the database. The bulk denial and raw error findings were folded afterward. Native approval evidence confirms UUID staff IDs, canonical lowercase staff emails, and an array-of-records scout RPC; this evidence does not replace live fixture acceptance. The native staff table has no active/revoked flag; removal from the server-controlled approval table revokes that approval.

GitHub deployment receipts name Max Bisinger's Vercel team (`max-bisingers-projects`, team ID `team_QaZ2hXqsmzLiAz1hBck5uIAu`) for `warubi-scout-preview` and `scout-buddy`. Current CLI and browser access list only `warubi-sports-projects`; Max's recorded deployment returns 404 for this login. These receipts identify the team deploying this repository but do not yet prove the current owner of the separate `warubi-scout-platform` alias.

Hosted CI checked implementation head 659ed4f (run 38514721293) and failed on frontend type checking. The unchanged main commit's earlier CI failed with the same error messages (43 annotations before, 44 after; no new message when line numbers are ignored). The Deno handler is included in that frontend check. No successful full frontend build is claimed. Mini execution was attempted but the sandbox could not resolve `mini`; the laptop remains below the 20 GB build floor. Exact CORS origin matching, payload/spending controls, real user acceptance, and hosting control remain unfinished.

Historical GitHub deployment records show production project `warubi-scout-platform` deployed under `max-bisingers-projects` on 2026-03-17 (deployment 4094868052, source c96f78f). All 437 repository deployments were inventoried. Current ownership and alias assignment remain unverified because the existing account cannot read that team. Claude's final static delta review returned GO WITH FOLDS for the draft and NO-GO for release; it found no correctness bug in the two code folds and did not run tests or network checks.
