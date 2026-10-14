# Prepared ITP AI authorization repair

The deployed ITP `gemini-proxy` v20 accepts a public anon JWT at the gateway but never checks for an actual user. An unsupported-operation public-key probe reached its handler without invoking a model. This branch adds verified user and staff/scout approval checks before reading an AI request.

The server file starts from the source returned by the provider for ITP project `umblyhwumtadlvgccdwg`, version 20, reported bundle hash `7b735341b66f8902fd8ec7f115329762077a4c4dc91982c3e850fdbd90cfee8b`. The downloaded index source SHA256 is `16e6be515118cc1f0c0ec30de642a5c7758e968546fa8d568d523066a8a20eeb`. The existing repository copy differs from that deployed source. All eleven deployed operations are retained, including `bulkGenerateOutreach`.

Authorization uses `/auth/v1/user`, then server-controlled admin metadata or existing `approved_staff` / `check_email_approved` records. It never trusts payload identities, user metadata, or `profiles.role`, and needs no service-role key. Runtime configuration is `SUPABASE_URL` plus `SUPABASE_PUBLISHABLE_KEY` (preferred) or the existing legacy `SUPABASE_ANON_KEY`. Legacy-key retirement requires configuring and verifying the modern public key first.

The companion client is based on main e49ee829671266cf93a6cf0826d0cc325c9e0394, which matches the live browser bundle’s public-key bearer logic and bulk outreach feature. It sends its session bearer token, reacquires it on retry, and does not retry authentication/approval failures. Existing fallback behavior remains available. Local client usage counters still run before access checks; they are not a spending control.

Closed tests (Node 24.11.1 or newer):

```sh
node supabase/functions/gemini-proxy/authorization.test.mjs
node services/geminiService.auth.test.mjs
```

The full handler uses mocked Auth, approval HTTP responses and Google models. The client test runs the real service with mocked Auth, HTTP and toast dependencies. No live model, database change or email send is part of these tests.

## Release state

Prepared only. This branch does not deploy the Edge Function. The deployed function currently has `verify_jwt=true`; this setting is retained. Production release remains blocked on real fixture authorization checks, server spending/payload limits, and deployment control / ownership of the previously untracked live function source. Public static-code checks confirm warubi-scout-platform.vercel.app is live, targets ITP, and uses the public anon key as its bearer. The current Vercel team cannot inspect this deployment. Separate ITP database-permission work is tracked in ITP Staff PR148; this branch applies no migration.

Claude Sonnet 5.5 reviewed the preparation at 2026-10-14T04:15Z (Oct 13 PDT): GO WITH FOLDS for preparation, NO-GO for release. The review's metadata/RPC/type/case questions were answered by native read-only checks; malformed-token status handling and client authorization retry findings were folded. No release approval is implied.
