import Link from "next/link";
import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";

export default function NotFound() {
  return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}><Container maxWidth="sm"><Paper sx={{ p: 6, textAlign: "center", border: "1px solid", borderColor: "divider", borderRadius: "8px" }}><Stack spacing={2} alignItems="center"><Typography variant="h4" fontWeight={800}>Page not found</Typography><Typography color="text.secondary">The monitoring workspace could not find that route.</Typography><Button component={Link} href="/" variant="contained">Return to dashboard</Button></Stack></Paper></Container></Box>;
}
