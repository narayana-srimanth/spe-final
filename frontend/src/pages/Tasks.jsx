import { useEffect, useMemo, useState } from "react";
import {
  Alert as MuiAlert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddTaskIcon from "@mui/icons-material/AddTask";
import { api } from "../api";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patient_id: "",
    title: "",
    priority: "medium",
    assigned_to: "",
    due_at: "",
  });

  const statusOptions = ["open", "in_progress", "done"];
  const priorityOptions = ["low", "medium", "high"];

  const patientMap = useMemo(
    () => Object.fromEntries(patients.map((p) => [p.id, p.name])),
    [patients]
  );

  useEffect(() => {
    (async () => {
      try {
        const [t, p] = await Promise.all([api.fetchTasks(), api.fetchPatients()]);
        setTasks(t);
        setPatients(p);
        if (!form.patient_id && p.length) {
          setForm((prev) => ({ ...prev, patient_id: p[0].id }));
        }
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const createTask = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...form };
      if (!payload.due_at) delete payload.due_at;
      const created = await api.createTask(payload);
      setTasks((prev) => [created, ...prev]);
      setForm({ patient_id: form.patient_id, title: "", priority: "medium", assigned_to: "", due_at: "" });
    } catch (err) {
      setError(err.message);
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      const updated = await api.updateTask(taskId, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = [
    {
      field: "title",
      headerName: "Task",
      flex: 2,
    },
    {
      field: "patient_id",
      headerName: "Patient",
      flex: 1,
      valueGetter: (params) => patientMap[params.value] || params.value,
    },
    {
      field: "priority",
      headerName: "Priority",
      flex: 0.6,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          color={params.value === "high" ? "error" : params.value === "medium" ? "warning" : "default"}
          variant="outlined"
        />
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      renderCell: (params) => (
        <TextField
          select
          size="small"
          value={params.value}
          onChange={(e) => updateStatus(params.row.id, e.target.value)}
        >
          {statusOptions.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      ),
    },
    { field: "assigned_to", headerName: "Assigned", flex: 1 },
    { field: "due_at", headerName: "Due", flex: 1, valueGetter: (p) => p.value ? new Date(p.value).toLocaleString() : "—" },
  ];

  return (
    <Stack spacing={3} className="fade-in">
      <div>
        <Typography variant="h5" fontWeight={800}>
          Tasks & Orders
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track clinical tasks by patient, priority, and status.
        </Typography>
      </div>

      <Card variant="outlined" className="gradient-surface">
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            component="form"
            onSubmit={createTask}
            alignItems="center"
          >
            <TextField
              select
              label="Patient"
              value={form.patient_id}
              onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
              sx={{ minWidth: 180 }}
            >
              {patients.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Task"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              fullWidth
            />
            <TextField
              select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              sx={{ minWidth: 140 }}
            >
              {priorityOptions.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Assign to"
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              sx={{ minWidth: 160 }}
            />
            <TextField
              label="Due at"
              type="datetime-local"
              value={form.due_at}
              onChange={(e) => setForm({ ...form, due_at: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 220 }}
            />
            <Button type="submit" variant="contained" startIcon={<AddTaskIcon />}>
              Add
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <MuiAlert severity="error" variant="filled">
          {error}
        </MuiAlert>
      )}

      <Card variant="outlined" className="gradient-surface">
        <CardContent>
          <Box sx={{ height: 500, width: "100%" }}>
            <DataGrid
              rows={tasks.map((t, idx) => ({ id: t.id || idx, ...t }))}
              columns={columns}
              pageSizeOptions={[5, 10]}
              initialState={{ pagination: { paginationModel: { pageSize: 5, page: 0 } } }}
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default Tasks;
