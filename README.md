# EarthRe SLA Monitoring Dashboard

A focused dashboard for ingesting multi-agent health-check CSVs, cleaning them at the API boundary, and reviewing the persisted evidence behind an SLA decision.

## Architecture

The browser uploads a CSV to `POST /api/upload` on the deployed Cloudflare Worker. The Worker parses and validates the file in the request lifetime only; it does not retain CSV bytes or state in memory after the request. It writes a dataset audit row and normalized check rows to Cloudflare D1. The same Worker serves `GET /api/dashboard`, which queries D1 for the latest dataset, summary metrics, per-service health, and filtered log records.

I chose Cloudflare Workers + D1 because both have a no-cost tier, keep the serverless processing and persistence in the same deployable unit, and make a straightforward audit path: raw upload → validation outcome → queryable normalized rows. The UI is a Vinext/React app deployed as the Worker frontend and backend.

## Data quality findings and handling

Across every supplied dataset, I found these issue classes:

- Required-field blanks: rows are rejected.
- Timestamps arrive as both ISO-8601 UTC strings and valid 10-digit Unix-second epochs. Both are normalized to ISO-8601 UTC; invalid timestamps are rejected.
- Repeated `(service_id, timestamp, agent)` readings: only the first is accepted; later duplicates are counted and skipped.
- Latency expressed in both `ms` and `s`: seconds are converted to milliseconds and stored as integer `latency_ms`.
- Invalid HTTP status `999`: statuses outside 100–599 are rejected.

The supplied files also differ in date span, so the dashboard derives its range from accepted records rather than assuming a fixed number of days. A non-2xx status is treated as a failed availability check. Validation results are persisted with each upload, so the dashboard makes the cleaning decision visible rather than silently mutating data.

## Assumptions and decisions

- The latest upload is the active dashboard dataset; prior uploads remain in D1 for auditability. This makes a re-upload non-destructive while keeping the single-screen interface unambiguous.
- Availability is `successful 2xx checks / accepted checks`. The card compares that figure with the stated 99.9% SLA target. This is a check-based proxy, not a contractual incident-duration calculation; a production system would confirm the SLA's aggregation and exclusion rules with the provider.
- A CSV must have the supplied eight headers. It must be under 8 MB, which keeps Worker request parsing bounded for this take-home dataset size.
- Duplicate identity includes the agent because independent monitoring agents can validly report the same service at the same timestamp.
- The dashboard shows total checks, failures, average and peak normalized latency, an SLA verdict, and per-service availability. These answer the immediate billing/on-call questions while the logs preserve the evidence.
- Dates use UTC, matching the source timestamps.

## Run locally

Requirements: Node 22+.

```sh
npm install
npm run db:generate
npx wrangler d1 migrations apply DB --local --config dist/server/wrangler.json
npm run dev
```

Run `npm run build` before the local migration command if `dist/server/wrangler.json` has not been generated. Then upload any CSV from `../case-study/`.

## Live deployment

https://earthre-sla-monitor.udaybhan44500.workers.dev

Source repository: https://github.com/Suraj1812/earthre-sla-monitor

## Deploy to your Cloudflare account

This uses your own Cloudflare account, D1 database, and Worker URL. Authenticate once, create the database, then deploy:

```sh
npx wrangler login
npx wrangler d1 create earthre-sla-monitor
# Copy the returned database_id, then:
export CF_D1_DATABASE_ID="paste-the-database-id-here"
npm run deploy:cloudflare
```

The deploy script builds the Worker, applies any pending D1 migrations, and deploys the frontend plus API. The deployed app is available at the live URL above.

To publish the source, create an empty GitHub repository and run:

```sh
git remote add github https://github.com/YOUR_USERNAME/earthre-sla-monitor.git
git push -u github main
```

## With more time

- Stream CSV parsing for substantially larger files and save raw files in R2 with a content hash.
- Add dataset history selection, paginated/filterable service and region views, and CSV export of validation rejects.
- Model SLA windows and incident-duration rules explicitly rather than using check-level availability alone.
- Add schema-backed test fixtures for malformed CSV quoting and transactional recovery metrics.
