# Shared

Runtime-neutral schemas, data contracts, labels, public site configuration and
media policies used on both sides of the application. No database access,
provider credentials, request context, Next.js server APIs or backend imports.

Types describe data; they do not authorize access. Backend services must still
validate input and enforce permissions. Never place private runtime environment
values here.
