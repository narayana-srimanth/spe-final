import { useEffect, useMemo, useState } from "react";
import {
  Grid,
  Stack,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import TimelineIcon from "@mui/icons-material/Timeline";
import StatCard from "../components/StatCard";
import { api } from "../api";

function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api
      .fetchPatients()
      .then(setPatients)
      .catch(() => {});
    api
      .fetchAlerts()
      .then(setAlerts)
      .catch(() => {});
    api
      .fetchTasks()
      .then(setTasks)
      .catch(() => {});
  }, []);

  const kpis = useMemo(() => {
    const highAlerts = alerts.filter((a) => a.severity === "high").length;
    const monitored = patients.filter(
      (p) => p.isMonitoring ?? p.is_monitoring ?? true,
    ).length;
    const openTasks = tasks.filter((t) => t.status !== "done").length;
    return [
      {
        title: "Monitored Patients",
        value: monitored,
        delta: "",
        color: "primary",
      },
      { title: "High Alerts", value: highAlerts, delta: "", color: "error" },
      {
        title: "Open Tasks",
        value: openTasks,
        delta: "",
        color: "warning",
        icon: <AssignmentTurnedInIcon />,
      },
      {
        title: "Total Alerts",
        value: alerts.length || 0,
        delta: "",
        color: "secondary",
      },
    ];
  }, [patients, alerts, tasks]);

  const riskMix = useMemo(() => {
    const counts = patients.reduce(
      (acc, p) => {
        acc[p.risk] = (acc[p.risk] || 0) + 1;
        return acc;
      },
      { high: 0, moderate: 0, normal: 0 },
    );
    const total = patients.length || 1;
    return [
      {
        label: "High",
        value: counts.high,
        percent: Math.round((counts.high / total) * 100),
        color: "error",
      },
      {
        label: "Moderate",
        value: counts.moderate,
        percent: Math.round((counts.moderate / total) * 100),
        color: "warning",
      },
      {
        label: "Normal",
        value: counts.normal,
        percent: Math.round((counts.normal / total) * 100),
        color: "success",
      },
    ];
  }, [patients]);

  const recentAlerts = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    [alerts],
  );

  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at) -
            new Date(a.updated_at || a.created_at),
        )
        .slice(0, 5),
    [tasks],
  );

  return (
    <Stack spacing={3} className="fade-in">
      <div>
        <Typography variant="h5" fontWeight={800}>
          Command overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live snapshot across patients, risk posture, alerts, and task load.
        </Typography>
      </div>

      <Grid container spacing={2}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.title}>
            <StatCard {...kpi} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} alignItems="flex-start">
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            className="gradient-surface"
            sx={{ height: 225 }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <TimelineIcon fontSize="small" />
                <Typography variant="h6" fontWeight={700}>
                  Risk mix
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Distribution of current patients by risk label.
              </Typography>
              <Stack spacing={1.5}>
                {riskMix.map((item) => (
                  <Stack key={item.label} spacing={0.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="subtitle2">{item.label}</Typography>
                      <Typography variant="subtitle2" color="text.secondary">
                        {item.value} • {item.percent}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={item.percent}
                      color={item.color}
                      sx={{ height: 8, borderRadius: 6 }}
                    />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            className="gradient-surface"
            sx={{ height: 225, display: "flex" }}
          >
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                flex: 1,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <WarningIcon fontSize="small" color="warning" />
                <Typography variant="h6" fontWeight={700}>
                  Recent alerts
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Latest five alerts across monitored patients.
              </Typography>
              <List dense sx={{ overflowY: "auto", flexGrow: 1, pr: 1 }}>
                {recentAlerts.map((a) => (
                  <Box key={a.alert_id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Chip
                              size="small"
                              label={a.severity}
                              color={
                                a.severity === "high"
                                  ? "error"
                                  : a.severity === "moderate"
                                    ? "warning"
                                    : "default"
                              }
                              variant="outlined"
                            />
                            <Typography variant="subtitle2">
                              {a.message}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {a.patient_name || a.patient_id} •{" "}
                            {new Date(a.created_at).toLocaleString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <Divider />
                  </Box>
                ))}
                {recentAlerts.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ p: 1 }}
                  >
                    No alerts yet.
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} alignItems="flex-start">
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            className="gradient-surface"
            sx={{ height: 225, display: "flex" }}
          >
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                flex: 1,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <AssignmentTurnedInIcon fontSize="small" />
                <Typography variant="h6" fontWeight={700}>
                  Tasks at a glance
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Fast view of the most recent tasks/orders.
              </Typography>
              <List dense sx={{ overflowY: "auto", flexGrow: 1, pr: 1 }}>
                {recentTasks.map((t) => (
                  <Box key={t.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Chip
                              size="small"
                              label={t.status}
                              color={
                                t.status === "done"
                                  ? "success"
                                  : t.status === "in_progress"
                                    ? "warning"
                                    : "default"
                              }
                              variant="outlined"
                            />
                            <Typography variant="subtitle2">
                              {t.title}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {t.patient_id} • {t.assigned_to || "unassigned"} •{" "}
                            {new Date(
                              t.updated_at || t.created_at,
                            ).toLocaleString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <Divider />
                  </Box>
                ))}
                {recentTasks.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ p: 1 }}
                  >
                    No tasks yet.
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" className="gradient-surface">
            <CardContent>
              <Typography variant="h6" fontWeight={700}>
                Ops pulse
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Quick operational metrics (mocked but relevant).
              </Typography>
              <Stack spacing={1.5}>
                <Metric label="API latency p95" value="185ms" percent={82} />
                <Metric
                  label="Scoring latency p95"
                  value="110ms"
                  percent={88}
                />
                <Metric
                  label="Error budget remaining"
                  value="98.4%"
                  percent={98}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

function Metric({ label, value, percent }) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="subtitle2" color="text.secondary">
          {value}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={percent} />
    </Stack>
  );
}

export default Dashboard;
