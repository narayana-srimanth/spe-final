import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
  Avatar,
  Chip,
  TextField,
  Button,
  MenuItem,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert as MuiAlert,
} from "@mui/material";
import { api } from "../api";

function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    location: "",
    risk: "normal",
    isMonitoring: true,
    notes: "",
  });
  const [toast, setToast] = useState("");

  useEffect(() => {
    api
      .fetchPatients()
      .then(setPatients)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await api.createPatient({
        ...form,
        age: Number(form.age || 0),
      });
      setPatients((prev) => [created, ...prev]);
      setToast("Patient added");
      setForm({ name: "", age: "", location: "", risk: "normal", isMonitoring: true, notes: "" });
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleMonitoring = async (patientId, currentValue) => {
    const next = !currentValue;
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, isMonitoring: next, is_monitoring: next } : p))
    );
    try {
      const updated = await api.updatePatientMonitoring(patientId, next);
      setPatients((prev) => prev.map((p) => (p.id === patientId ? updated : p)));
      setToast(`Monitoring ${next ? "enabled" : "disabled"}`);
    } catch (err) {
      setError(err.message);
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, isMonitoring: currentValue, is_monitoring: currentValue } : p))
      );
    }
  };

  return (
    <Stack spacing={3} className="fade-in">
      <div>
        <Typography variant="h5" fontWeight={800}>
          Patients
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Snapshot of monitored patients and current risk posture. Add new patients below.
        </Typography>
      </div>

      <Card variant="outlined" className="gradient-surface">
        <CardContent>
          <form onSubmit={submit}>
            <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Age"
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Risk"
                select
                value={form.risk}
                onChange={(e) => setForm({ ...form, risk: e.target.value })}
                fullWidth
              >
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="moderate">Moderate</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </TextField>
              <TextField
                select
                label="Monitor?"
                value={form.isMonitoring ? "yes" : "no"}
                onChange={(e) => setForm({ ...form, isMonitoring: e.target.value === "yes" })}
                fullWidth
              >
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </TextField>
              <Button type="submit" variant="contained" size="large">
                Add
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>

      {error && (
        <MuiAlert severity="error" variant="filled">
          {error}
        </MuiAlert>
      )}

      <Grid container spacing={2}>
        {patients.map((p) => (
          <Grid item xs={12} md={4} key={p.id}>
            <Card variant="outlined" className="gradient-surface">
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar>{p.name.slice(0, 1)}</Avatar>
                  <div>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {p.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.location} • Age {p.age}
                    </Typography>
                  </div>
                  <Chip
                    label={p.risk}
                    color={p.risk === "high" ? "error" : p.risk === "moderate" ? "warning" : "success"}
                    variant="outlined"
                    sx={{ ml: "auto" }}
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={p.isMonitoring ?? p.is_monitoring ?? true}
                        onChange={() => toggleMonitoring(p.id, p.isMonitoring ?? p.is_monitoring ?? true)}
                      />
                    }
                    label={(p.isMonitoring ?? p.is_monitoring ?? true) ? "Monitoring" : "Not monitored"}
                  />
                  {p.notes && (
                    <Typography variant="body2" color="text.secondary">
                      {p.notes}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {!loading && patients.length === 0 && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  No patients yet. Add one above.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2500}
        onClose={() => setToast("")}
        message={toast}
      />
    </Stack>
  );
}

export default Patients;
