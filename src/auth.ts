import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { betterAuth, type BetterAuthOptions } from "better-auth";

/**
 * Required env:
 *   BETTER_AUTH_SECRET   - random 32+ byte secret for signing sessions/cookies
 *   BETTER_AUTH_URL      - public origin of THIS service, e.g. https://login.kleinbem.dev
 *   TRUSTED_ORIGINS      - comma-separated site origins allowed to call us, e.g. https://kleinbem.dev
 *   COOKIE_DOMAIN        - parent domain for cross-subdomain cookies, e.g. .kleinbem.dev
 *   DB_PATH              - sqlite file path (default ./data/auth.db)
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 *   FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET
 *   GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
 *   LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET
 *   MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET
 */

const required = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "TRUSTED_ORIGINS"] as const;
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`kleinbem-auth: missing required env: ${missing.join(", ")}`);
  process.exit(78); // EX_CONFIG
}

const dbPath = process.env.DB_PATH ?? "./data/auth.db";
mkdirSync(dirname(dbPath), { recursive: true });

export const trustedOrigins = process.env
  .TRUSTED_ORIGINS!.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  socialProviders.facebook = {
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  };
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  socialProviders.linkedin = {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  };
}
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  socialProviders.microsoft = {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  };
}

const cookieDomain = process.env.COOKIE_DOMAIN;

export const auth = betterAuth({
  database: new Database(dbPath),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  emailAndPassword: { enabled: false },
  socialProviders,
  advanced: {
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    },
  },
});
