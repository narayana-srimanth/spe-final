import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Stack,
  Switch,
  Typography,
  FormControlLabel,
  Slider,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import { api } from "../api";

function Settings({ mode, onToggleMode, animationsEnabled, onToggleAnimations, hue }) {
  const [prefs, setPrefs] = useState({
    email: "",
    sms: "",
    webhook_url: "",
    severity_threshold: "moderate",
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // sync body dataset for CSS backgrounds
    document.body.dataset.theme = mode;
  }, [mode]);

  useEffect(() => {
    api
      .getNotificationPrefs()
      .then(setPrefs)
      .catch(() => setPrefs({ email: "", sms: "", webhook_url: "", severity_threshold: "moderate" }));
  }, []);

  const savePrefs = async () => {
    setStatus("");
    setError("");
    try {
      const saved = await api.setNotificationPrefs(prefs);
      setPrefs(saved);
      setStatus("Notification preferences saved");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Stack spacing={3} className="fade-in">
      <div>
        <Typography variant="h5" fontWeight={800}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Personalize your experience: theme, motion, and color responsiveness.
        </Typography>
      </div>

      <Card variant="outlined" className="gradient-surface">
        <CardContent>
          <Stack spacing={2}>
            <FormControlLabel
              control={<Switch checked={mode === "dark"} onChange={onToggleMode} />}
              label="Dark mode"
            />
            <FormControlLabel
              control={<Switch checked={animationsEnabled} onChange={onToggleAnimations} />}
              label="Enable background animations"
            />
            <div>
              <Typography variant="subtitle2">Cursor hue responsiveness</Typography>
              <Typography variant="body2" color="text.secondary">
                Move your cursor to shift the hue. Current hue: {Math.round(hue)}°
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Hue sensitivity</Typography>
              <Slider
                value={0}
                step={1}
                min={0}
                max={1}
                disabled
                valueLabelDisplay="off"
              />
              <Typography variant="caption" color="text.secondary">
                Cursor position directly controls hue (fixed sensitivity).
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Notification channels</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} mt={1}>
                <TextField
                  label="Email"
                  value={prefs.email}
                  onChange={(e) => setPrefs({ ...prefs, email: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="SMS"
                  value={prefs.sms}
                  onChange={(e) => setPrefs({ ...prefs, sms: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Webhook URL"
                  value={prefs.webhook_url}
                  onChange={(e) => setPrefs({ ...prefs, webhook_url: e.target.value })}
                  fullWidth
                />
              </Stack>
              <TextField
                select
                label="Severity threshold"
                value={prefs.severity_threshold}
                onChange={(e) => setPrefs({ ...prefs, severity_threshold: e.target.value })}
                sx={{ mt: 2, minWidth: 200 }}
                SelectProps={{ native: true }}
              >
                <option value="moderate">Moderate & High</option>
                <option value="high">High only</option>
              </TextField>
              <Stack direction="row" spacing={2} mt={2}>
                <Button variant="contained" onClick={savePrefs}>
                  Save preferences
                </Button>
                {status && <Alert severity="success">{status}</Alert>}
                {error && <Alert severity="error">{error}</Alert>}
              </Stack>
            </div>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default Settings;
