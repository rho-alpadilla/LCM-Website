# Inactive prototype

`supabase/` contains the preserved Supabase clients, environment helpers and MFA
component. These files are not used by the active Cloudflare website. ESLint
blocks active UI/backend/routing imports of this prototype.

Historical migrations and SQL tests remain under the root `supabase/` folder so
their existing tooling stays intact. Dependencies are retained for reference;
removing this prototype is a separate, explicitly approved cleanup.
