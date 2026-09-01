# kleinbem-auth — agent notes

Self-hosted better-auth service for kleinbem.dev visitor login. TypeScript, ESM,
NodeNext. No framework — plain `node:http` + `toNodeHandler(auth)`.

- `src/auth.ts` — the `betterAuth({...})` instance; all config via env (see README table).
- `src/server.ts` — http listener; `/health` + everything else → better-auth.
- `src/migrate.ts` — applies the schema; run after `npm run build`, before `npm start`.

Build: `npm run build` (tsc → `dist/`). Verify: `npm run check` (typecheck) + boot
smoke (`node dist/migrate.js` then `node dist/server.js`, hit `/api/auth/ok`).

Deployment is out-of-tree: `nix-packages/pkgs/kleinbem-auth` builds this,
`nix-presets/containers/kleinbem-auth.nix` runs it as a container, Caddy fronts it
at `login.kleinbem.dev`. Secrets come from `kleinbem-secrets` (sops), never committed.
