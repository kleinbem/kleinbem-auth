import { createServer } from "node:http";
import { toNodeHandler } from "better-auth/node";
import { auth, trustedOrigins } from "./auth.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const handler = toNodeHandler(auth);

// toNodeHandler only adapts better-auth's request logic — it emits no CORS
// headers and answers no OPTIONS preflight of its own. trustedOrigins (above)
// only gates better-auth's *internal* origin checks (state param, cookies);
// without this, a browser's preflight for any cross-subdomain call (e.g.
// kleinbem.dev -> login.kleinbem.dev) gets a bare 404 and the real request
// never fires, silently, since better-auth's client throws on that swallowed
// by callers with no .catch().
function applyCors(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) {
  const origin = req.headers.origin;
  if (origin && trustedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
}

const server = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ?? "content-type"
    );
    res.writeHead(204);
    res.end();
    return;
  }

  void handler(req, res);
});

server.listen(port, host, () => {
  console.log(
    `kleinbem-auth listening on http://${host}:${port} (baseURL ${auth.options.baseURL})`
  );
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
