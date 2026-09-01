// Applies better-auth's schema migrations to the SQLite database.
// Run as a pre-start step (systemd ExecStartPre) and in CI.
import { getMigrations } from "better-auth/db/migration";
import { auth } from "./auth.js";

const { toBeAdded, toBeCreated, runMigrations } = await getMigrations(auth.options);

if (toBeAdded.length === 0 && toBeCreated.length === 0) {
  console.log("kleinbem-auth: schema already up to date");
} else {
  await runMigrations();
  console.log(
    `kleinbem-auth: applied migrations (${toBeCreated.length} tables created, ${toBeAdded.length} altered)`
  );
}
process.exit(0);
