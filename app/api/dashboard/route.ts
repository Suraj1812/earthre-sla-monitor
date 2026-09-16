import { env } from "cloudflare:workers";

const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "Database binding unavailable." }, 503);
  const url = new URL(request.url);

  try {
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const requestedPage = Number.parseInt(url.searchParams.get("page") || "0", 10);
    const requestedPageSize = Number.parseInt(url.searchParams.get("pageSize") || "25", 10);
    const page = Number.isFinite(requestedPage) ? Math.max(0, requestedPage) : 0;
    const pageSize = Number.isFinite(requestedPageSize) ? Math.min(100, Math.max(10, requestedPageSize)) : 25;
    const latest = await env.DB.prepare("SELECT * FROM uploads ORDER BY uploaded_at DESC LIMIT 1").first<Record<string, unknown>>();
    const uploadHistory = await env.DB.prepare(
      "SELECT id, filename, uploaded_at AS uploadedAt, accepted_rows AS acceptedRows, rejected_rows AS rejectedRows, duplicate_rows AS duplicateRows, date_from AS dateFrom, date_to AS dateTo FROM uploads ORDER BY uploaded_at DESC LIMIT 20",
    ).all();
    if (!latest) return json({ upload: null, uploads: [], stats: null, services: [], logs: [] });

    const uploadId = latest.id as string;
    const clauses = ["upload_id = ?1"];
    const binds: string[] = [uploadId];
    if (from) { clauses.push(`check_date >= ?${binds.length + 1}`); binds.push(from); }
    if (to) { clauses.push(`check_date <= ?${binds.length + 1}`); binds.push(to); }
    const where = clauses.join(" AND ");
    const aggregate = await env.DB.prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status_code BETWEEN 200 AND 299 THEN 1 ELSE 0 END) AS successful,
        SUM(CASE WHEN status_code < 200 OR status_code > 299 THEN 1 ELSE 0 END) AS failed,
        ROUND(AVG(latency_ms), 0) AS avg_latency, MAX(latency_ms) AS max_latency,
        MIN(timestamp) AS first_check, MAX(timestamp) AS last_check
       FROM checks WHERE ${where}`,
    ).bind(...binds).first<Record<string, number | string | null>>();
    const services = await env.DB.prepare(
      `SELECT service_id AS serviceId, service_name AS serviceName, COUNT(*) AS total,
        SUM(CASE WHEN status_code BETWEEN 200 AND 299 THEN 1 ELSE 0 END) AS successful,
        ROUND(AVG(latency_ms), 0) AS avgLatency
       FROM checks WHERE ${where} GROUP BY service_id, service_name ORDER BY service_name`,
    ).bind(...binds).all();
    const logs = await env.DB.prepare(
      `SELECT service_id AS serviceId, service_name AS serviceName, timestamp, status_code AS statusCode,
        latency_ms AS latencyMs, agent, region FROM checks WHERE ${where} ORDER BY timestamp DESC LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`,
    ).bind(...binds, pageSize, page * pageSize).all();
    const stats = aggregate || { total: 0, successful: 0, failed: 0, avg_latency: 0, max_latency: 0 };
    const total = Number(stats.total || 0);
    return json({
      upload: latest,
      uploads: uploadHistory.results,
      stats: { ...stats, availability: total ? (Number(stats.successful || 0) / total) * 100 : 0, meetsSla: total ? (Number(stats.successful || 0) / total) * 100 >= 99.9 : null },
      services: services.results,
      logs: logs.results,
      logTotal: total,
      logPage: page,
      logPageSize: pageSize,
    });
  } catch {
    return json({ error: "Dashboard data is temporarily unavailable. Please try again shortly." }, 503);
  }
}
