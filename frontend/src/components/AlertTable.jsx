import { DataGrid } from "@mui/x-data-grid";
import { Box, Chip } from "@mui/material";

const columns = [
  {
    field: "patient_name",
    headerName: "Patient",
    flex: 1.2,
    valueGetter: (params) => params.row.patient_name || params.row.patient_id,
  },
  { field: "patient_id", headerName: "Patient ID", flex: 0.8 },
  { field: "message", headerName: "Message", flex: 2 },
  {
    field: "severity",
    headerName: "Severity",
    flex: 1,
    renderCell: (params) => (
      <Chip
        size="small"
        label={params.value}
        color={params.value === "high" ? "error" : params.value === "moderate" ? "warning" : "default"}
        variant="outlined"
      />
    ),
  },
  { field: "created_at", headerName: "Created", flex: 1 },
];

function AlertTable({ rows }) {
  return (
    <Box sx={{ height: 400, width: "100%" }}>
      <DataGrid
        rows={rows.map((row, idx) => ({ id: row.alert_id || idx, ...row }))}
        columns={columns}
        disableRowSelectionOnClick
        pageSizeOptions={[5, 10]}
        initialState={{
          pagination: { paginationModel: { pageSize: 5, page: 0 } },
        }}
      />
    </Box>
  );
}

export default AlertTable;
