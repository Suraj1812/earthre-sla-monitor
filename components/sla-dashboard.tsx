"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "@/components/toast";
import {
  Alert, AppBar, Box, Button, ButtonBase, Chip, CircularProgress, Collapse,
  Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  IconButton, LinearProgress, Paper, Skeleton, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField, Toolbar, Tooltip, Typography,
} from "@mui/material";
import {
  CheckCircle, Close, ErrorOutlined, ExpandLess, ExpandMore, History, InsertDriveFile,
  FilterAlt, Refresh, Speed, UploadFile, WarningAmber,
} from "@mui/icons-material";

type Upload = { id?: string; filename: string; uploaded_at?: string; uploadedAt?: string; accepted_rows?: number; acceptedRows?: number; rejected_rows?: number; rejectedRows?: number; duplicate_rows?: number; duplicateRows?: number; date_from?: string; dateFrom?: string; date_to?: string; dateTo?: string };
type Stats = { total: number; successful: number; failed: number; avg_latency: number; max_latency: number; availability: number; meetsSla: boolean | null };
type Service = { serviceId: string; serviceName: string; total: number; successful: number; avgLatency: number };
type Log = { serviceId: string; serviceName: string; timestamp: string; statusCode: number; latencyMs: number; agent: string; region: string };
type DashboardData = { upload: Upload | null; uploads?: Upload[]; stats: Stats | null; services: Service[]; logs: Log[]; logTotal?: number; error?: string };

const number = new Intl.NumberFormat("en-IN");
const formatAvailability = (value: number) => `${value.toFixed(3)}%`;
const surface = { border: "1px solid", borderColor: "rgba(16,42,67,.12)", borderRadius: "8px", boxShadow: "0 4px 18px rgba(16,42,67,.05)" };

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.text();
  let parsed: unknown;
  if (body) {
    try { parsed = JSON.parse(body); } catch { parsed = undefined; }
  }
  if (!response.ok) {
    const serverMessage = parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string" ? parsed.error : fallback;
    throw new Error(serverMessage);
  }
  if (!parsed || typeof parsed !== "object") throw new Error(fallback);
  return parsed as T;
}

export function SlaDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (showFeedback = false, nextPage = page, nextRowsPerPage = rowsPerPage, rangeFrom = from, rangeTo = to) => {
    const params = new URLSearchParams();
    if (rangeFrom) params.set("from", rangeFrom);
    if (rangeTo) params.set("to", rangeTo);
    params.set("page", String(nextPage));
    params.set("pageSize", String(nextRowsPerPage));
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?${params}`);
      const result = await parseResponse<DashboardData>(response, "Dashboard data is temporarily unavailable. Please try again shortly.");
      if (!response.ok || result.error) throw new Error(result.error || "Could not load dashboard data.");
      setData(result); setPage(nextPage); setRowsPerPage(nextRowsPerPage);
      setLoadError(null);
      if (showFeedback) toast.success("Filters applied", { description: rangeFrom || rangeTo ? "Showing the requested UTC date range." : "Showing the full monitoring window." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dashboard data is temporarily unavailable. Please try again shortly.";
      setLoadError(message);
      toast.error("Dashboard unavailable", { description: message });
    } finally { setLoading(false); }
  }, [from, to, page, rowsPerPage]);

  useEffect(() => { void load(); }, [load]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData(); form.append("file", file);
    const uploadToast = toast.loading("Validating and saving CSV…", { description: file.name });
    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const result = await parseResponse<{ upload: Upload }>(response, "Upload failed. Please choose another CSV and try again.");
      const upload = result.upload as Upload;
      toast.success("Dataset ready", { id: uploadToast, description: `${number.format(upload.acceptedRows || 0)} accepted · ${number.format(upload.rejectedRows || 0)} rejected · ${number.format(upload.duplicateRows || 0)} duplicates skipped` });
      setFrom(""); setTo(""); setPage(0); await load(false, 0, rowsPerPage, "", "");
    } catch (error) {
      toast.error("Upload failed", { id: uploadToast, description: error instanceof Error ? error.message : "Please choose another CSV." });
    } finally { setUploading(false); event.target.value = ""; }
  }

  function applyFilter() {
    if (from && to && from > to) { toast.error("Invalid date range", { description: "The start date must be on or before the end date." }); return; }
    void load(true, 0, rowsPerPage);
  }

  const stats = data?.stats;

  return <Box sx={{ minHeight: "100vh", pb: 6 }}>
    <AppBar position="static" elevation={0} color="transparent" sx={{ bgcolor: "rgba(255,255,255,.82)", backdropFilter: "blur(12px)", borderBottom: "1px solid", borderColor: "divider" }}>
      <Container maxWidth={false} sx={{ width: "100%", maxWidth: 1600, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}><Toolbar disableGutters sx={{ minHeight: { xs: 60, sm: 68 }, gap: 2 }}>
        <Button component={Link} to="/" color="inherit" sx={{ p: 0, minWidth: 0, textTransform: "none", lineHeight: 1 }} aria-label="EarthRe SLA Monitor home">
          <Box component="span" sx={{ color: "primary.main", fontSize: { xs: 28, sm: 36 }, fontWeight: 400, letterSpacing: -1.5, fontFamily: "DM Sans, Inter, Arial, Helvetica, sans-serif" }}>earthRe</Box>
        </Button>
        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ ml: "auto" }}>
          <Button component="label" variant="contained" color="primary" size="small" startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFile />} disabled={uploading} sx={{ minHeight: 40, px: { xs: 1.5, sm: 2 }, whiteSpace: "nowrap", boxShadow: 2 }}>
            {uploading ? "Processing…" : "Upload CSV"}<input hidden aria-label="Upload monitoring CSV" type="file" accept=".csv,text/csv" onChange={handleUpload} disabled={uploading} />
          </Button>
          <Tooltip title="Dataset history" placement="bottom">
            <IconButton
              aria-label="Open dataset history"
              onClick={() => setHistoryOpen(true)}
              sx={{
                width: 40,
                height: 40,
                color: "primary.main",
                borderRadius: 1,
                "&:hover": { bgcolor: "rgba(16,42,67,.08)" },
                "& svg": { fontSize: 24 },
              }}
            >
              <History />
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar></Container>
    </AppBar>

    <Container maxWidth={false} sx={{ width: "100%", maxWidth: 1600, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, pt: { xs: 2.5, md: 3.5 } }}>
      {loading && !data ? <DashboardSkeleton /> : loadError && !data ? <ErrorState message={loadError} onRetry={() => void load(false, 0, rowsPerPage, "", "")} /> : !data?.upload ? <EmptyState /> : <>
        <DatasetHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} uploads={data.uploads ?? []} activeUpload={data.upload} />
        <StatsPanel stats={stats} services={data.services} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        <LogsPanel from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={applyFilter} loading={loading} logs={data.logs} totalLogs={data.logTotal ?? data.logs.length} page={page} rowsPerPage={rowsPerPage} onPageChange={(_, nextPage) => setPage(nextPage)} onRowsPerPageChange={(event) => { setRowsPerPage(Number.parseInt(event.target.value, 10)); setPage(0); }} />
      </>}
    </Container>
  </Box>;
}

function DatasetHistoryDialog({ open, onClose, uploads, activeUpload }: { open: boolean; onClose: () => void; uploads: Upload[]; activeUpload: Upload | null }) {
  const formatUploadedAt = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{ pr: 6 }}>
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        justifyContent="center"
      >
        <History
          color="secondary"
          sx={{ fontSize: 32, transform: "translateY(2px)" }}
        />
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Dataset history
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Recent monitoring imports
          </Typography>
        </Box>
      </Stack>
      <Tooltip title="Close"><IconButton aria-label="Close" onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}><Close /></IconButton></Tooltip>
    </DialogTitle>
    <DialogContent dividers sx={{ p: 0 }}>
      {uploads.length ? uploads.map((item, index) => {
        const accepted = item.acceptedRows ?? item.accepted_rows ?? 0;
        const rejected = item.rejectedRows ?? item.rejected_rows ?? 0;
        const duplicates = item.duplicateRows ?? item.duplicate_rows ?? 0;
        const dateFrom = item.dateFrom ?? item.date_from;
        const dateTo = item.dateTo ?? item.date_to;
        const isCurrent = index === 0 && item.filename === activeUpload?.filename;
        const uploadedLabel = formatUploadedAt(item.uploadedAt ?? item.uploaded_at);
        return <Box key={item.id ?? `${item.filename}-${item.uploadedAt ?? item.uploaded_at ?? index}`} sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: index < uploads.length - 1 ? "1px solid" : "none", borderColor: "divider", bgcolor: isCurrent ? "rgba(22,139,109,.045)" : "transparent" }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ width: 34, height: 34, borderRadius: "8px", bgcolor: "rgba(16,42,67,.07)", color: "primary.main", display: "grid", placeItems: "center", flexShrink: 0 }}><InsertDriveFile fontSize="small" /></Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography fontWeight={800} sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.filename}</Typography>
                {isCurrent && <Chip label="Current" size="small" color="success" />}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{dateFrom || "—"} → {dateTo || "—"}</Typography>
              {uploadedLabel && <Typography variant="caption" color="text.secondary">Uploaded {uploadedLabel}</Typography>}
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                <Typography variant="caption"><Box component="strong">{number.format(Number(accepted))}</Box> accepted</Typography>
                <Typography variant="caption"><Box component="strong">{number.format(Number(rejected))}</Box> rejected</Typography>
                <Typography variant="caption"><Box component="strong">{number.format(Number(duplicates))}</Box> duplicates</Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>;
      }) : <Stack alignItems="center" spacing={1} sx={{ p: 5, color: "text.secondary" }}><History /><Typography>No uploads yet</Typography></Stack>}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
  </Dialog>;
}

function DashboardSkeleton() {
  return <Stack spacing={2} aria-label="Loading dashboard" role="status">
    <Paper sx={{ ...surface, p: { xs: 1.75, sm: 2.25 } }}><Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}><Box sx={{ flex: 1 }}><Skeleton variant="text" width="35%" height={22} /><Skeleton variant="text" width="58%" height={30} /></Box><Skeleton variant="rounded" width={150} height={40} /></Stack></Paper>
    <Paper sx={{ ...surface, overflow: "hidden" }}>
      <Box sx={{ p: { xs: 1.75, sm: 2.5 } }}><Skeleton variant="rounded" width={150} height={28} /></Box>
      <Skeleton variant="rectangular" height={92} sx={{ bgcolor: "rgba(237,181,95,.18)" }} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,1fr)", sm: "repeat(4,1fr)" }, bgcolor: "#f7faf9" }}>{Array.from({ length: 4 }).map((_, index) => <Box key={index} sx={{ p: { xs: 1.75, sm: 2.25 } }}><Skeleton variant="text" width="72%" /><Skeleton variant="text" width="48%" height={34} /></Box>)}</Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(5,1fr)" }, gap: 1, p: { xs: 1.25, sm: 1.75 } }}>{Array.from({ length: 5 }).map((_, index) => <Box key={index} sx={{ p: 1.5, bgcolor: "#f7faf9", borderRadius: "8px" }}><Skeleton variant="text" width="70%" /><Skeleton variant="text" width="45%" /><Skeleton variant="text" width="82%" /></Box>)}</Box>
    </Paper>
    <Paper sx={{ ...surface, overflow: "hidden" }}><Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" sx={{ p: { xs: 1.75, sm: 2.5 } }}><Box><Skeleton variant="text" width={125} /><Skeleton variant="text" width={145} height={34} /></Box><Stack direction="row" spacing={1}><Skeleton variant="rounded" width={145} height={40} /><Skeleton variant="rounded" width={145} height={40} /><Skeleton variant="rounded" width={105} height={40} /></Stack></Stack><Skeleton variant="text" width="32%" sx={{ mx: { xs: 1.75, sm: 2.5 }, mb: 1.5 }} /><Skeleton variant="rectangular" height={360} sx={{ bgcolor: "rgba(16,42,67,.035)" }} /></Paper>
  </Stack>;
}

function EmptyState() { return <Paper sx={{ ...surface, minHeight: 355, display: "grid", placeItems: "center", p: { xs: 3, sm: 6 }, textAlign: "center" }}><Stack spacing={1.5} sx={{ width: "100%", maxWidth: 560, alignItems: "center" }}><UploadFile color="success" sx={{ fontSize: 36 }} /><Typography variant="h6">Start with a monitoring export</Typography><Typography color="text.secondary" sx={{ maxWidth: 520 }}>Upload a CSV to validate it, normalize latency to milliseconds, and persist a cleaned dataset for review.</Typography></Stack></Paper>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <Paper sx={{ ...surface, minHeight: 355, display: "grid", placeItems: "center", p: { xs: 3, sm: 6 }, textAlign: "center" }}><Stack spacing={1.5} sx={{ width: "100%", maxWidth: 560, alignItems: "center" }}><ErrorOutlined color="error" sx={{ fontSize: 40 }} /><Typography variant="h6" fontWeight={800}>Dashboard data unavailable</Typography><Typography color="text.secondary">{message}</Typography><Button variant="outlined" startIcon={<Refresh />} onClick={onRetry}>Try again</Button></Stack></Paper>; }
function Metric({ label, value }: { label: string; value: string }) { return <Box sx={{ p: { xs: 1.75, sm: 2.25 }, minWidth: 0 }}><Typography variant="body2" color="text.secondary" noWrap>{label}</Typography><Typography variant="h5" sx={{ mt: 0.5, fontWeight: 800, letterSpacing: -0.5 }}>{value}</Typography></Box>; }

function StatsPanel({ stats, services, collapsed, onToggle }: { stats: Stats | null; services: Service[]; collapsed: boolean; onToggle: () => void }) {
  const [selected, setSelected] = useState<Service | null>(null);
  return <Paper sx={{ ...surface, overflow: "hidden" }}>
    <Button
      fullWidth
      onClick={onToggle}
      aria-expanded={!collapsed}
      sx={{
        display: "flex",
        justifyContent: "flex-start",
        px: { xs: 1.75, sm: 2.5 },
        py: 1.5,
        color: "text.primary",
        fontWeight: 800,
        fontSize: 15,
        textAlign: "left",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        sx={{
          flex: 1,
          minWidth: 0,
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 30,
              height: 30,
              borderRadius: 1.5,
              bgcolor: "rgba(22,139,109,.12)",
              color: "secondary.main",
            }}
          >
            <Speed fontSize="small" />
          </Box>

          <span>SLA health</span>
        </Stack>

        {collapsed ? <ExpandMore /> : <ExpandLess />}
      </Stack>
    </Button>
    <Collapse in={!collapsed}><Divider /><Alert severity={stats?.meetsSla ? "success" : "warning"} icon={stats?.meetsSla ? <CheckCircle /> : <WarningAmber />} sx={{ borderRadius: 0, alignItems: "center", py: 1.5, px: { xs: 1.75, sm: 2.5 } }}><Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={{ xs: 0.25, sm: 1 }}><Typography fontWeight={800}>{stats?.meetsSla ? "SLA achieved" : "SLA at risk"}</Typography><Typography sx={{ fontSize: { xs: 24, sm: 28 }, lineHeight: 1.1, fontWeight: 800 }}>{formatAvailability(stats?.availability || 0)}</Typography><Typography variant="body2">against 99.900% monthly target</Typography></Stack></Alert>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,1fr)", sm: "repeat(4,1fr)" }, borderTop: "1px solid", borderColor: "rgba(16,42,67,.10)", bgcolor: "#f7faf9", "& > * + *": { borderLeft: { sm: "1px solid" }, borderColor: "rgba(16,42,67,.10)" } }}><Metric label="Accepted checks" value={number.format(stats?.total || 0)} /><Metric label="Failed checks" value={number.format(stats?.failed || 0)} /><Metric label="Average latency" value={`${number.format(stats?.avg_latency || 0)} ms`} /><Metric label="Peak latency" value={`${number.format(stats?.max_latency || 0)} ms`} /></Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(5,1fr)" }, gap: 1, p: { xs: 1.25, sm: 1.75 }, borderTop: "1px solid", borderColor: "rgba(16,42,67,.10)" }}>{services.map((service) => <ButtonBase key={service.serviceId} onClick={() => setSelected(service)} sx={{ display: "block", textAlign: "left", p: { xs: 1.5, sm: 1.75 }, borderRadius: "8px", bgcolor: "#f7faf9", "&:hover": { bgcolor: "#edf7f3", color: "secondary.main" } }}><Typography variant="body2" color="text.secondary">{service.serviceName}</Typography><Typography fontWeight={800}>{formatAvailability((service.successful / service.total) * 100)}</Typography><Typography variant="caption" color="secondary">{number.format(service.avgLatency)} ms avg · View detail</Typography></ButtonBase>)}</Box>
    </Collapse>
    <Dialog open={selected !== null} onClose={() => setSelected(null)} fullWidth maxWidth="sm"><DialogTitle sx={{ pr: 6 }}>{selected?.serviceName}<Tooltip title="Close"><IconButton aria-label="Close" onClick={() => setSelected(null)} sx={{ position: "absolute", right: 8, top: 8 }}><Close /></IconButton></Tooltip></DialogTitle><DialogContent dividers><Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>{selected?.serviceId} · availability details for the selected dataset</Typography>{selected && <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)" }, gap: 1.5 }}>{[["Availability", formatAvailability((selected.successful / selected.total) * 100)], ["Checks", number.format(selected.total)], ["Failed", number.format(selected.total - selected.successful)], ["Average latency", `${number.format(selected.avgLatency)} ms`]].map(([label, value]) => <Paper variant="outlined" key={label} sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" fontWeight={800}>{value}</Typography></Paper>)}</Box>}</DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Close</Button></DialogActions></Dialog>
  </Paper>;
}

function LogsPanel({ from, to, setFrom, setTo, onApply, loading, logs, totalLogs, page, rowsPerPage, onPageChange, onRowsPerPageChange }: { from: string; to: string; setFrom: (value: string) => void; setTo: (value: string) => void; onApply: () => void; loading: boolean; logs: Log[]; totalLogs: number; page: number; rowsPerPage: number; onPageChange: (_event: unknown, page: number) => void; onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void }) {
  return <Paper sx={{ ...surface, mt: 2, overflow: "hidden" }}>
    <Box sx={{ px: { xs: 1.75, sm: 2.5 }, py: 1.5 }}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={{ xs: 1.5, lg: 2 }}
        alignItems={{ xs: "stretch", lg: "center" }}
        sx={{ width: "100%" }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            color="secondary"
            sx={{
              display: "block",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.1,
              textTransform: "uppercase",
              lineHeight: 1.2,
            }}
          >
            Monitoring logs
          </Typography>

          <Typography
            variant="h5"
            sx={{
              mt: 0.25,
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: -0.5,
            }}
          >
            Check log
          </Typography>
        </Box>

        <Stack
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            onApply();
          }}
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <TextField
            label="From"
            type="date"
            size="small"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: { xs: "100%", sm: 150 } }}
          />

          <TextField
            label="To"
            type="date"
            size="small"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: { xs: "100%", sm: 150 } }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={15} color="inherit" />
              ) : (
                <FilterAlt />
              )
            }
            sx={{
              minWidth: { xs: "100%", sm: 108 },
              height: 40,
            }}
          >
            {loading ? "Loading" : "Apply"}
          </Button>
        </Stack>
      </Stack>
    </Box>
    <LinearProgress sx={{ height: 2, visibility: loading ? "visible" : "hidden" }} />
    <TableContainer sx={{ maxHeight: 600, overflow: "auto", borderTop: "1px solid", borderColor: "divider" }}>
      <Table stickyHeader size="small" sx={{ minWidth: 760, "& th": { bgcolor: "#f4f8f8", fontWeight: 800, fontSize: 12, letterSpacing: 0.3, textTransform: "uppercase" }, "& td": { py: 1.25 } }}>
        <TableHead><TableRow><TableCell>Timestamp</TableCell><TableCell>Service</TableCell><TableCell>Result</TableCell><TableCell>Latency</TableCell><TableCell>Agent / region</TableCell></TableRow></TableHead>
        <TableBody>{logs.map((log, index) => <TableRow key={`${log.timestamp}-${log.agent}-${index}`} hover><TableCell sx={{ whiteSpace: "nowrap", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}>{new Date(log.timestamp).toISOString().replace("T", " ").replace(".000Z", " UTC")}</TableCell><TableCell><Typography fontWeight={700}>{log.serviceName}</Typography><Typography variant="caption" color="text.secondary">{log.serviceId}</Typography></TableCell><TableCell><Chip size="small" label={log.statusCode} color={log.statusCode >= 200 && log.statusCode < 300 ? "success" : "error"} /></TableCell><TableCell sx={{ whiteSpace: "nowrap", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}>{number.format(log.latencyMs)} ms</TableCell><TableCell><Typography fontWeight={700}>{log.agent}</Typography><Typography variant="caption" color="text.secondary">{log.region}</Typography></TableCell></TableRow>)}</TableBody>
      </Table>
    </TableContainer>
    <TablePagination component="div" count={totalLogs} page={page} onPageChange={onPageChange} rowsPerPage={rowsPerPage} onRowsPerPageChange={onRowsPerPageChange} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage="Rows" sx={{ borderTop: "1px solid", borderColor: "divider" }} />
  </Paper>;
}
