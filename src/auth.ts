import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { mailer, mailFrom } from "./mailer.js";

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
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD / SMTP_FROM
 *     - optional; email+password sign-up and password reset only enable
 *       once these exist (see mailer.ts) — off by default, same pattern
 *       as the social providers above.
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
  emailAndPassword: {
    enabled: mailer !== null,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      if (!mailer) return; // unreachable given enabled above, kept for type safety
      await mailer.sendMail({
        from: mailFrom,
        to: user.email,
        subject: "Reset your kleinbem.dev password",
        text: `Click the link below to reset your password:\n\n${url}\n\nIf you didn't request this, ignore this email.`,
      });
    },
  },
  socialProviders,
  session: {
    // "Stay logged in" — sessions are valid up to 30 days, refreshed
    // (rolling) once a day while active so a regular visitor is
    // effectively never logged out. Applies to every sign-in method
    // (social + email/password) since it's server-side session validity,
    // not a cookie setting. The email/password form separately offers a
    // "Remember me" checkbox (better-auth's built-in rememberMe on
    // /sign-in/email) — unchecking it doesn't shorten this 30-day window,
    // it just makes the *cookie* itself session-only (cleared when the
    // browser closes) instead of persistent. Social sign-in has no
    // equivalent client-side toggle in better-auth, so those sessions
    // always get a persistent cookie.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    },
  },
  // Honeypot for the /register form. `website` is a name real users never
  // fill (it's visually hidden client-side) but generic form-filling bots
  // commonly do. additionalFields (not a raw extra body key) is what
  // guarantees this actually survives better-auth's own input validation
  // and reaches the hook below — returned: false keeps it out of API
  // responses too. This only protects sign-up called through better-auth's
  // own endpoint; it does nothing by itself if bots call the DB directly,
  // which they can't from outside anyway.
  user: {
    additionalFields: {
      website: { type: "string", required: false, input: true, returned: false },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && ctx.body?.website) {
        throw new APIError("BAD_REQUEST", { message: "Registration failed" });
      }
    }),
  },
});
