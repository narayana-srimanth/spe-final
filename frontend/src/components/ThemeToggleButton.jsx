import { Box } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

function ThemeToggleButton({ mode, onToggle }) {
  const isDark = mode === "dark";
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      sx={{
        width: 64,
        height: 30,
        borderRadius: 999,
        background: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
        border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(15,23,42,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: isDark ? "flex-end" : "flex-start",
        padding: "0 6px",
        cursor: "pointer",
        transition: "all 0.25s ease",
        boxShadow: isDark ? "0 6px 18px rgba(0,0,0,0.35)" : "0 8px 20px rgba(15,23,42,0.12)",
      }}
    >
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: isDark ? "#f1f5f9" : "#0f172a",
          color: isDark ? "#0f172a" : "#f8fafc",
          display: "grid",
          placeItems: "center",
          transition: "transform 0.25s ease, background 0.25s ease",
          transform: isDark ? "translateX(0)" : "translateX(0)",
        }}
      >
        {isDark ? (
          <DarkModeIcon sx={{ fontSize: 14 }} />
        ) : (
          <LightModeIcon sx={{ fontSize: 14 }} />
        )}
      </Box>
    </Box>
  );
}

export default ThemeToggleButton;
