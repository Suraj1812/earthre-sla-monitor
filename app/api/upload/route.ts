import { env } from "cloudflare:workers";

const required = ["service_id", "service_name", "timestamp", "status_code", "latency", "latency_unit", "agent", "region"];
type CsvRow = { values: string[]; row: number };

const parseRecords = (source: string): CsvRow[] => {
  const records: CsvRow[] = []; let values: string[] = []; let value = ""; let quoted = false; let row = 1;
  for (let index = 0; index < source.length; index++) {
    const char = source[index]; const next = source[index + 1];
    if (char === '"') { if (quoted && next === '"') { value += '"'; index++; } else quoted = !quoted; continue; }
    if (char === "," && !quoted) { values.push(value); value = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index++;
      values.push(value); if (values.some((entry) => entry !== "")) records.push({ values, row });
      values = []; value = ""; row++; continue;
    }
    value += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (value || values.length) { values.push(value); records.push({ values, row }); }
  return records;
};

const parseCsv = (text: string) => {
  const records = parseRecords(text.replace(/^\uFEFF/, "")); const header = records.shift();
  const headers = header?.values.map((value) => value.trim());
  if (!headers || required.some((field) => !headers.includes(field))) throw new Error("CSV is missing one or more required columns.");
  return records.map(({ values, row }) => {
    if (values.length !== headers.length) throw new Error(`CSV row ${row} has ${values.length} values; expected ${headers.length}.`);
    return { row, values: Object.fromEntries(headers.map((header, index) => [header, values[index].trim()])) };
  });
};

const parseTimestamp = (value: string) => {
  if (/^\d{10}$/.test(value)) return new Date(Number(value) * 1000);
  if (/^\d{13}$/.test(value)) return new Date(Number(value));
  return new Date(value);
};
const json = (body: unknown, status = 200) => Response.json(body, { status });

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "Database binding unavailable." }, 503);
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) return json({ error: "Choose a CSV file." }, 400);
    if (file.size > 8_000_000) return json({ error: "CSV must be smaller than 8 MB." }, 400);
    const rows = parseCsv(await file.text());
    const seen = new Set<string>();
    const clean: Array<{ sourceRow: number; serviceId: string; serviceName: string; timestamp: string; checkDate: string; statusCode: number; latencyMs: number; agent: string; region: string }> = [];
    let rejected = 0; let duplicates = 0;
    for (const { row, values } of rows) {
      if (required.some((field) => !values[field])) { rejected++; continue; }
      const timestamp = parseTimestamp(values.timestamp);
      const statusCode = Number(values.status_code);
      const latency = Number(values.latency);
      const multiplier = values.latency_unit.toLowerCase() === "s" ? 1000 : values.latency_unit.toLowerCase() === "ms" ? 1 : 0;
      if (Number.isNaN(timestamp.valueOf()) || !Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599 || !Number.isFinite(latency) || latency < 0 || !multiplier) { rejected++; continue; }
      const iso = timestamp.toISOString(); const key = `${values.service_id}|${iso}|${values.agent}`;
      if (seen.has(key)) { duplicates++; continue; }
      seen.add(key);
      clean.push({ sourceRow: row, serviceId: values.service_id, serviceName: values.service_name, timestamp: iso, checkDate: iso.slice(0, 10), statusCode, latencyMs: Math.round(latency * multiplier), agent: values.agent, region: values.region });
    }
    if (!clean.length) return json({ error: "No valid records remained after validation." }, 422);
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    const dates = clean.map((record) => record.checkDate).sort();
    await env.DB.batch([env.DB.prepare("INSERT INTO uploads (id, filename, uploaded_at, accepted_rows, rejected_rows, duplicate_rows, date_from, date_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, file.name, now, clean.length, rejected, duplicates, dates[0], dates[dates.length - 1])]);
    for (let start = 0; start < clean.length; start += 100) {
      await env.DB.batch(clean.slice(start, start + 100).map((record) => env.DB.prepare(
        "INSERT INTO checks (id, upload_id, source_row, service_id, service_name, timestamp, check_date, status_code, latency_ms, agent, region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), id, record.sourceRow, record.serviceId, record.serviceName, record.timestamp, record.checkDate, record.statusCode, record.latencyMs, record.agent, record.region)));
    }
    return json({ upload: { id, filename: file.name, acceptedRows: clean.length, rejectedRows: rejected, duplicateRows: duplicates, dateFrom: dates[0], dateTo: dates[dates.length - 1] } }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Upload could not be processed." }, 400);
  }
}
