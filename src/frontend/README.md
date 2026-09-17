# Frontend

- `screens/public/` and `screens/admin/`: screen presentation, grouped by feature.
- `components/`: reusable public and staff UI; interactive components explicitly use `"use client"`.
- `lib/`: display formatting, not business rules or data access.
- `api/`: browser HTTP requests, separate from form rendering and interaction state.
- `types/`: browser-only ambient declarations.

Screens are React Server Components unless marked otherwise. They may load
backend queries or staff context on the server. Reusable components can receive
data through props and submit explicit backend server actions. Browser code
calls public/protected HTTP endpoints; it never imports repositories or secrets.

Route URLs, metadata, dynamic-rendering flags and layouts stay in `src/app`.
Shared types and validation belong in `src/shared`. See `docs/CODE_STRUCTURE.md`.
