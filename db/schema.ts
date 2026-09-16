import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  acceptedRows: integer("accepted_rows").notNull(),
  rejectedRows: integer("rejected_rows").notNull(),
  duplicateRows: integer("duplicate_rows").notNull(),
  dateFrom: text("date_from"),
  dateTo: text("date_to"),
});

export const checks = sqliteTable(
  "checks",
  {
    id: text("id").primaryKey(),
    uploadId: text("upload_id").notNull().references(() => uploads.id),
    sourceRow: integer("source_row").notNull(),
    serviceId: text("service_id").notNull(),
    serviceName: text("service_name").notNull(),
    timestamp: text("timestamp").notNull(),
    checkDate: text("check_date").notNull(),
    statusCode: integer("status_code").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    agent: text("agent").notNull(),
    region: text("region").notNull(),
  },
  (table) => [
    index("idx_checks_upload_date").on(table.uploadId, table.checkDate, table.timestamp),
    index("idx_checks_upload_service").on(table.uploadId, table.serviceId),
    uniqueIndex("uq_checks_upload_reading").on(table.uploadId, table.serviceId, table.timestamp, table.agent),
  ],
);
