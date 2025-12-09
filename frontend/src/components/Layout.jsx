import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PeopleIcon from "@mui/icons-material/People";
import ShieldIcon from "@mui/icons-material/Shield";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { api } from "../api";
import SettingsIcon from "@mui/icons-material/Settings";

const drawerWidth = 240;

export function Layout({ children, onToggleTheme, themeMode, role }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertFlash, setAlertFlash] = useState(false);
  const [latestAlertSeverity, setLatestAlertSeverity] = useState(null);
  const latestAlertIdRef = useRef(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  const [settingsAnchor, setSettingsAnchor] = useState(null);

  useEffect(() => {
    let active = true;
    let flashTimeout;
    const pollAlerts = async () => {
      try {
        const data = await api.fetchAlerts();
        if (!active || !Array.isArray(data) || data.length === 0) return;
        const newest = data.reduce((acc, cur) => {
          if (!acc) return cur;
          return new Date(cur.created_at) > new Date(acc.created_at) ? cur : acc;
        }, null);
        if (newest?.alert_id && newest.alert_id !== latestAlertIdRef.current) {
          setAlertFlash(true);
          flashTimeout = setTimeout(() => setAlertFlash(false), 2000);
          latestAlertIdRef.current = newest.alert_id;
        }
        if (newest?.severity) {
          setLatestAlertSeverity(newest.severity);
        }
      } catch (err) {
        // ignore polling errors to avoid UI noise
      }
    };
    pollAlerts();
    const interval = setInterval(pollAlerts, 8000);
    return () => {
      active = false;
      clearInterval(interval);
      if (flashTimeout) clearTimeout(flashTimeout);
    };
  }, []);

  const alertIconColor =
    alertFlash && latestAlertSeverity === "high"
      ? "error.main"
      : alertFlash && latestAlertSeverity === "moderate"
      ? "warning.main"
      : undefined;

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <SpaceDashboardIcon /> },
    { label: "Monitoring", path: "/monitoring", icon: <ShowChartIcon /> },
    {
      label: "Alerts",
      path: "/alerts",
      icon: (
        <Box sx={{ position: "relative" }}>
          <NotificationsActiveIcon
            sx={{
              color: alertIconColor,
              animation: alertFlash ? "pulseAlert 0.9s ease-in-out infinite alternate" : "none",
              filter: alertFlash ? "drop-shadow(0 0 10px rgba(255,99,132,0.5))" : "none",
              transition: "transform 0.3s ease, color 0.3s ease",
              transform: alertFlash ? "scale(1.08)" : "scale(1)",
            }}
          />
          {alertFlash && (
            <Box
              sx={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: alertIconColor || "primary.main",
                animation: "ping 1.2s ease-out infinite",
              }}
            />
          )}
        </Box>
      ),
    },
    { label: "Patients", path: "/patients", icon: <PeopleIcon /> },
    { label: "Tasks", path: "/tasks", icon: <AssignmentTurnedInIcon /> },
    ...(role === "admin" || role === "ops" ? [{ label: "Audit", path: "/audit", icon: <ShieldIcon /> }] : []),
  ];

  const drawer = (
    <div style={{ height: "100%" }}>
      <Toolbar>
        <Typography variant="h6" fontWeight={800}>
          SentinelCare
        </Typography>
      </Toolbar>
      <List sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              setMobileOpen(false);
              document.getElementById("settings-anchor")?.click();
            }}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  const isDark = themeMode === "dark";

  return (
    <Box sx={{ display: "flex" }}>
      <Box className="hue-overlay" />
      <CssBaseline />
      <AppBar
        position="fixed"
        color="inherit"
        elevation={1}
        sx={{
          borderBottom: isDark
            ? "1px solid rgba(226,232,240,0.08)"
            : "1px solid #e2e8f0",
          background: isDark ? "rgba(7,10,22,0.92)" : "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          color: isDark ? "#e2e8f0" : "#0f172a",
        }}
      >
        <Toolbar
          sx={{
            backgroundColor: "transparent",
            color: isDark ? "#e2e8f0" : "#0f172a",
          }}
        >
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Command Console
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            id="settings-anchor"
            color="inherit"
            onClick={(e) => setSettingsAnchor(e.currentTarget)}
            sx={{
              border: isDark ? "1px solid rgba(226,232,240,0.28)" : "1px solid rgba(15,23,42,0.12)",
              borderRadius: 2,
              ml: 1,
              backdropFilter: "blur(8px)",
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "1px solid #e2e8f0",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          background: "transparent",
          minHeight: "100vh",
        }}
      >
        <Toolbar />
        <Box className="fade-in">{children}</Box>
      </Box>
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={() => setSettingsAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={onToggleTheme}>{isDark ? "Switch to light" : "Switch to dark"}</MenuItem>
        <MenuItem
          onClick={() => {
            setLoggingOut(true);
            localStorage.removeItem("sc_token");
            localStorage.removeItem("sc_role");
            window.location.href = "/login";
          }}
          disabled={loggingOut}
        >
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}
