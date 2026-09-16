"use client";

import { useEffect, useState } from "react";
import { Box, Skeleton, Stack } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SlaDashboard } from "@/components/sla-dashboard";

export function AppRoutes() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <RouteSkeleton />;

  return <BrowserRouter>
    <Routes>
      <Route path="/" element={<SlaDashboard />} />
      <Route path="/dashboard" element={<SlaDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>;
}

function RouteSkeleton() {
  return <Box sx={{ minHeight: "100vh", bgcolor: "#f4f8f8", p: { xs: 2, sm: 3 } }} aria-label="Loading dashboard" role="status">
    <Box sx={{ maxWidth: 1600, mx: "auto" }}>
      <Skeleton variant="rounded" width={120} height={34} sx={{ mb: 4 }} />
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={76} />
        <Skeleton variant="rounded" height={250} />
        <Skeleton variant="rounded" height={420} />
      </Stack>
    </Box>
  </Box>;
}
