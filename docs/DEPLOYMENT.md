# Deploy Stepwise with private cross-device progress

## Vercel website

Import `hfxstudios0001/harshit-AI` in Vercel. Keep the root directory at the repository root. `vercel.json` configures installation, build, and output. No keys are required for device-only learning. All Python and SQLite runtime files are bundled during the build; deploy the entire output.

## Private account service

1. Create a Supabase project in your own account.
2. Run `supabase/migrations/202610270001_private_progress.sql` in that project's SQL editor.
3. In Authentication settings, enable email sign-in. Set Site URL to the actual Vercel website URL and add that exact URL as an allowed redirect destination. For a custom domain, add its exact HTTPS origin too.
4. In Vercel environment settings, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the project's URL and public publishable key (legacy anon key is also supported). Never use a service-role or admin key. These public client values are bundled into the website; database row-level security protects records.
5. Redeploy after changing build-time configuration.
6. Open Account & settings. Request a sign-in link and open the email in the same browser. Sign in separately on each device. If email delivery is limited by the provider, configure its supported email delivery service.
7. Local-only and signed-in workspaces are separate. Export local progress first, then import the backup after signing in if you want to move it into your account.

## Required cloud acceptance tests

These cannot be replaced by a successful local build or mocked service test:

- Sign in on device A, complete an exercise, and verify the saved cloud record.
- Sign in on device B and confirm the same progress and notes load.
- Edit both device copies and confirm stale saves show a conflict with both versions downloadable.
- Confirm an anonymous database request cannot read or write progress.
- With a second test identity, verify it cannot read or write the first identity's row.
- Sign out and verify account data does not appear in the separate local-only workspace.
- Check expired sign-in links, offline saves, and a restored network connection.

The database uses authenticated ownership policies and an atomic revision-checked save function. The client never sends a target user ID to the save function; the database derives it from the authenticated session. SQL installation and live authorization checks must be completed before claiming cross-device readiness.
