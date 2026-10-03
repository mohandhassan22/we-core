-- ALREADY APPLIED to production (2026-10-03). Closes the public email/username/role enumeration on profiles.
-- Visitors keep id + full_name only because assets/js/active-users-widget.js reads those with the public key.
revoke select on public.profiles from anon;
grant select (id, full_name) on public.profiles to anon;

-- OPTIONAL later step, once the widget change in this PR is deployed (the widget then uses the user's token):
--   revoke select on public.profiles from anon;
--
-- ROLLBACK (only if something unexpected breaks):
--   grant select on public.profiles to anon;
