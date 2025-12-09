import { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { buildTheme } from "./theme";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring";
import Alerts from "./pages/Alerts";
import Patients from "./pages/Patients";
import Security from "./pages/Security";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import Tasks from "./pages/Tasks";
import Audit from "./pages/Audit";
import { api, setToken } from "./api";

function App() {
  const location = useLocation();
  const [themeMode, setThemeMode] = useState("dark");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [hue, setHue] = useState(240);
  const rafRef = useRef(null);
  const [token, setTokenState] = useState(localStorage.getItem("sc_token") || "");
  const [role, setRole] = useState(localStorage.getItem("sc_role") || "");

  useEffect(() => {
    setToken(token);
  }, [token]);

  useEffect(() => {
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    const handleMove = (e) => {
      const ratioX = e.clientX / window.innerWidth;
      const ratioY = e.clientY / window.innerHeight;
      const newHue = 200 + ratioX * 100 + ratioY * 20;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setHue((prev) => {
          if (Math.abs(prev - newHue) < 2) return prev;
          return newHue;
        });
        document.documentElement.style.setProperty("--cursor-hue", `${newHue}`);
        document.documentElement.style.setProperty("--cursor-x", `${(ratioX * 100).toFixed(1)}%`);
        document.documentElement.style.setProperty("--cursor-y", `${(ratioY * 100).toFixed(1)}%`);
        rafRef.current = null;
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isAuthRoute = useMemo(
    () => location.pathname === "/login" || location.pathname === "/signup",
    [location.pathname]
  );

  const theme = useMemo(() => buildTheme(themeMode, hue), [themeMode, hue]);

  const shell = (
    <Layout
      onToggleTheme={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
      themeMode={themeMode}
      role={role}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/security" element={<Security />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/audit" element={<Audit />} />
        <Route
          path="/settings"
          element={
            <Settings
              mode={themeMode}
              onToggleMode={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
              animationsEnabled={animationsEnabled}
              onToggleAnimations={() => setAnimationsEnabled((prev) => !prev)}
              hue={hue}
            />
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isAuthRoute ? (
        <Routes>
          <Route
            path="/login"
            element={
              <Login
                onLogin={async (username, password) => {
                  const resp = await api.login(username, password);
                  setToken(resp.access_token);
                  setTokenState(resp.access_token);
                  setRole(resp.role || "");
                  localStorage.setItem("sc_role", resp.role || "");
                  return resp;
                }}
              />
            }
          />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        (token ? shell : <Navigate to="/login" replace />)
      )}
    </ThemeProvider>
  );
}

export default App;
