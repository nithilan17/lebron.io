# Deployment checklist

1. Acquire and validate a rights-compatible historical source and run the offline importer.
2. Commit or otherwise make the generated, checksummed graph artifact available during Vercel build. Do not download it per request.
3. Replace the fixture loader with the generated server-only artifact and regenerate the versioned schedule.
4. Set Node 20+ in Vercel, run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
5. Confirm graph artifact size remains inside Vercel function bundle constraints; cache parsed immutable graph module-wide for warm invocations.

No secrets are required for the fixture. Production ingestion credentials, if any, belong only in CI secrets and never in `NEXT_PUBLIC_*` variables.
