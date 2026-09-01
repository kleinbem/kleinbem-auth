# kleinbem-auth

Self-hosted auth service for **kleinbem.dev** — social login (Google, Facebook, …)
for site visitors. [better-auth](https://better-auth.com) + SQLite, no external
auth vendor.

Deployed as a standalone nspawn container on the fleet (ADR-002): preset in
`nix-presets/containers/kleinbem-auth.nix`, packaged in `nix-packages`, fronted
by Caddy at `login.kleinbem.dev`. The static site (`kleinbem-site`) talks to it
via `better-auth/svelte` from a small island; cookies are shared across
`*.kleinbem.dev` via `COOKIE_DOMAIN=.kleinbem.dev`.

`auth.kleinbem.dev` is deliberately **not** used here — that hostname is reserved
for the separate persona-Authentik plan (`nix-presets/containers/authentik.nix`).

## Run locally

```sh
cp .env.example .env      # fill BETTER_AUTH_SECRET (openssl rand -hex 32)
npm install
npm run build             # tsc → dist/
npm run migrate           # create/upgrade the SQLite schema
npm start                 # http://localhost:3000, routes under /api/auth/*
```

Source is TypeScript (`src/*.ts`, NodeNext); `npm run check` typechecks, `npm run
dev` runs `src/server.ts` directly via Node's type stripping.

## Environment

| var | required | notes |
|-----|----------|-------|
| `BETTER_AUTH_SECRET` | yes | session/cookie signing key, 32+ bytes |
| `BETTER_AUTH_URL` | yes | public origin of this service, e.g. `https://login.kleinbem.dev` |
| `TRUSTED_ORIGINS` | yes | comma-separated site origins allowed to call the API |
| `COOKIE_DOMAIN` | prod | `.kleinbem.dev` for cross-subdomain cookies |
| `DB_PATH` | no | SQLite file, default `./data/auth.db` |
| `PORT` / `HOST` | no | default `3000` / `0.0.0.0` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | enables Google login when both set |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | no | enables Facebook login when both set |

OAuth redirect URIs to register with each provider:

- Google: `https://login.kleinbem.dev/api/auth/callback/google`
- Facebook: `https://login.kleinbem.dev/api/auth/callback/facebook`
