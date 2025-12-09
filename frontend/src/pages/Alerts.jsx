import { useEffect, useState } from "react";
import { Stack, Typography, Card, CardContent, LinearProgress } from "@mui/material";
import AlertTable from "../components/AlertTable";
import { api } from "../api";

function Alerts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetchAlerts()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack spacing={3} className="fade-in">
      <div>
        <Typography variant="h5" fontWeight={800}>
          Alerts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live feed from the alert pipeline with severity and timestamps.
        </Typography>
      </div>

      <Card variant="outlined" className="gradient-surface">
        <CardContent>
          {loading ? <LinearProgress /> : <AlertTable rows={rows} />}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default Alerts;
