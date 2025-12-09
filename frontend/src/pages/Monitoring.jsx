import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert as MuiAlert,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { api } from "../api";

function Monitoring() {
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState("");
  const [risk, setRisk] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api
      .fetchPatients()
      .then((p) => {
        setPatients(p);
        const monitoring = p.filter(
          (item) => item.isMonitoring ?? item.is_monitoring ?? true
        );
        if (monitoring.length) setSelected(monitoring[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!autoRefresh || !selected) return;
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, [autoRefresh, selected]);

  useEffect(() => {
    if (tick === 0 || !selected || !autoRefresh) return;
    simulate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const simulate = async (silent = false) => {
    if (!selected) return;
    setLoading(!silent);
    if (!silent) setError(null);
    try {
      const resp = await api.simulate({ patient_id: selected, risk });
      setResult(resp);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  return (
    <Stack spacing={3} className="fade-in">
      <div>
        <Typography variant="h5" fontWeight={800}>
          Monitoring
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live observability for ingestion, scoring, and alerting services.
        </Typography>
      </div>

      <Card variant="outlined" className="gradient-surface">
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <TextField
              select
              label="Patient"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              sx={{ minWidth: 200 }}
              helperText={
                patients.filter((p) => p.isMonitoring ?? p.is_monitoring ?? true).length === 0
                  ? "No patients marked for monitoring yet"
                  : undefined
              }
            >
              {patients
                .filter((p) => p.isMonitoring ?? p.is_monitoring ?? true)
                .map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              select
              label="Risk profile"
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="moderate">Moderate</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
            <Button variant="contained" onClick={simulate} disabled={loading || !selected}>
              {loading ? "Running..." : "Generate vitals & score"}
            </Button>
            <FormControlLabel
              control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
              label="Live mode"
            />
          </Stack>
          {error && (
            <MuiAlert sx={{ mt: 2 }} severity="error" variant="filled">
              {error}
            </MuiAlert>
          )}
          {result && (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} mt={3}>
              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Latest generated vitals
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    HR {result.vitals.heart_rate} • RR {result.vitals.respiratory_rate} • Temp{" "}
                    {result.vitals.temperature_c}°C • SpO2 {result.vitals.spo2}%
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ width: 260 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Risk score
                  </Typography>
                  <Typography variant="h4" fontWeight={800}>
                    {(result.score.risk_score * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Label: {result.score.risk_label} • Model: {result.score.model_version}
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {[
          {
            label: "Heart rate",
            value: result?.vitals?.heart_rate ? `${result.vitals.heart_rate} bpm` : "--",
          },
          {
            label: "Respiratory rate",
            value: result?.vitals?.respiratory_rate ? `${result.vitals.respiratory_rate} rpm` : "--",
          },
          {
            label: "Blood pressure",
            value:
              result?.vitals?.systolic_bp && result?.vitals?.diastolic_bp
                ? `${result.vitals.systolic_bp}/${result.vitals.diastolic_bp} mmHg`
                : "--",
          },
          {
            label: "Mean arterial pressure",
            value:
              result?.vitals?.systolic_bp && result?.vitals?.diastolic_bp
                ? `${Math.round((result.vitals.systolic_bp + 2 * result.vitals.diastolic_bp) / 3)} mmHg`
                : "--",
          },
          {
            label: "Shock index",
            value:
              result?.vitals?.heart_rate && result?.vitals?.systolic_bp
                ? (result.vitals.heart_rate / result.vitals.systolic_bp).toFixed(2)
                : "--",
          },
          {
            label: "Pulse pressure",
            value:
              result?.vitals?.systolic_bp && result?.vitals?.diastolic_bp
                ? `${result.vitals.systolic_bp - result.vitals.diastolic_bp} mmHg`
                : "--",
          },
          {
            label: "SpO₂",
            value: result?.vitals?.spo2 ? `${result.vitals.spo2}%` : "--",
          },
          {
            label: "O₂ gap",
            value: result?.vitals?.spo2 ? `${(100 - result.vitals.spo2).toFixed(0)}% to 100%` : "--",
          },
          {
            label: "Temperature",
            value: result?.vitals?.temperature_c ? `${result.vitals.temperature_c} °C` : "--",
          },
          {
            label: "Risk score",
            value: result?.score?.risk_score ? `${(result.score.risk_score * 100).toFixed(1)}%` : "--",
            extra: result?.score?.risk_label,
          },
        ].map((metric) => (
          <Grid item xs={12} md={4} key={metric.label}>
            <Card variant="outlined" className="gradient-surface">
              <CardContent>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {metric.label}
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {metric.value}
                  </Typography>
                  {metric.extra && (
                    <Typography variant="body2" color="text.secondary">
                      {metric.extra}
                    </Typography>
                  )}
                  {!result && (
                    <LinearProgress
                      variant="indeterminate"
                      sx={{ mt: 1, opacity: 0.4 }}
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

export default Monitoring;
