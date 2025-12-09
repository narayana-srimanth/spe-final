import { createTheme } from "@mui/material/styles";

export const buildTheme = (mode = "light", hue = 240) => {
  const primary = `hsl(${hue}, 78%, ${mode === "light" ? "63%" : "70%"})`;
  const secondary = `hsl(${(hue + 60) % 360}, 80%, ${mode === "light" ? "54%" : "60%"})`;
  const paper = mode === "light" ? "rgba(255,255,255,0.9)" : "rgba(17,24,39,0.8)";
  const defaultBg = mode === "light" ? "#f6f7fb" : "#0b1021";

  return createTheme({
    palette: {
      mode,
      primary: { main: primary },
      secondary: { main: secondary },
      background: {
        default: defaultBg,
        paper,
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      subtitle1: { color: mode === "light" ? "#475569" : "#cbd5e1" },
    },
    shadows: [
      "none",
      "0 10px 30px rgba(15,23,42,0.07)",
      ...Array(23).fill("0 10px 30px rgba(15,23,42,0.07)"),
    ],
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backdropFilter: "blur(8px)",
            border: mode === "light" ? "1px solid #e2e8f0" : "1px solid #1f2937",
            backgroundColor: mode === "light" ? "rgba(255,255,255,0.9)" : "rgba(15,23,42,0.82)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: mode === "light" ? "rgba(255,255,255,0.9)" : "rgba(15,23,42,0.85)",
            backdropFilter: "blur(12px)",
            color: mode === "light" ? "#0f172a" : "#e2e8f0",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: mode === "light" ? "rgba(255,255,255,0.9)" : "rgba(15,23,42,0.92)",
            color: mode === "light" ? "#0f172a" : "#e2e8f0",
            borderRight: mode === "light" ? "1px solid #e2e8f0" : "1px solid #1f2937",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            "&.Mui-selected": {
              background: mode === "light" ? "rgba(107,107,245,0.12)" : "rgba(107,107,245,0.2)",
            },
          },
        },
      },
    },
  });
};
