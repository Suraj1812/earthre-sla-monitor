"use client";

import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";

const theme = createTheme({
  palette: {
    primary: { main: "#102a43" },
    secondary: { main: "#168b6d" },
    success: { main: "#168b6d" },
  },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h5: { letterSpacing: "-0.02em" },
    body2: { lineHeight: 1.45 },
  },
  shape: { borderRadius: 6 },
});

export function MuiProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>;
}
