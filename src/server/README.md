# Server Modules

- `repositories/` will contain typed database access.
- `services/` will contain business rules and permission-aware use cases.
- `integrations/` will isolate Supabase, email and payment-provider details.

Service credentials must remain server-only. UI components must never import privileged server modules.
