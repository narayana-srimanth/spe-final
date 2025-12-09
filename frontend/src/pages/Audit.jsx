import { useEffect, useState } from "react";
import { Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { api } from "../api";

function Audit() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetchAudit()
      .then((data) => setRows(data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { field: "action", headerName: "Action", flex: 1 },
    { field: "subject", headerName: "User", flex: 1 },
    { field: "actor_role", headerName: "Role", flex: 0.7 },
    { field: "detail", headerName: "Detail", flex: 2 },
    {
      field: "created_at",
      headerName: "When",
      flex: 1.2,
      valueGetter: (params) => (params.value ? new Date(params.value).toLocaleString() : ""),
    },
  ];

  return (
    <Stack spacing={3} className="fade-in">
      <div>
        <Typography variant="h5" fontWeight={800}>
          Audit trail
        </Typography>
        <Typography variant="body2" color="text.secondary">
          System events across services with actors, roles, and timestamps.
        </Typography>
      </div>

      <Card variant="outlined" className="gradient-surface">
        <CardContent>
          {loading ? (
            <LinearProgress />
          ) : (
            <div style={{ height: 500, width: "100%" }}>
              <DataGrid
                rows={rows.map((r, idx) => ({ id: r.id || idx, ...r }))}
                columns={columns}
                pageSizeOptions={[10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

export default Audit;
