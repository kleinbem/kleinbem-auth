import nodemailer from "nodemailer";

/**
 * Sends outbound mail via the fleet's own Stalwart server (submission port,
 * plain auth over STARTTLS — see nix-presets/containers/stalwart.nix), not
 * a third-party API. kleinbem-auth is a plain Node service (unlike the
 * Cloudflare Pages Function powering the site's contact form), so it can
 * speak SMTP directly with no edge-runtime constraint forcing a vendor.
 *
 * Optional: undefined when SMTP_HOST/SMTP_USER/SMTP_PASSWORD aren't set,
 * same "off until configured" pattern as the social providers.
 */
export const mailer =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: false, // STARTTLS on 587, not implicit TLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      })
    : null;

export const mailFrom = process.env.SMTP_FROM ?? "kleinbem-auth <noreply@kleinbem.dev>";
