import { env } from "cloudflare:workers";

export function GET() {
  return Response.json({ ok: true, service: "earthre-sla-monitor", database: Boolean(env.DB) });
}
