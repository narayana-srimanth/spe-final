import { Card, CardContent, Grid, Stack, Typography, Chip, LinearProgress } from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import HttpsIcon from "@mui/icons-material/Https";
import PolicyIcon from "@mui/icons-material/Policy";

const controls = [
  { icon: <ShieldIcon color="primary" />, title: "mTLS enforced", status: "active" },
  { icon: <HttpsIcon color="primary" />, title: "JWT validation", status: "active" },
  { icon: <PolicyIcon color="primary" />, title: "OPA/Gatekeeper", status: "pending" },
];

function Security() {
  return (
    <Stack spacing={3} className="fade-in">
      <div>
        <Typography variant="h5" fontWeight={800}>
          Security & Compliance
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live view of controls across authentication, policy, and runtime hardening.
        </Typography>
      </div>

      <Grid container spacing={2}>
        {controls.map((c) => (
          <Grid item xs={12} md={4} key={c.title}>
            <Card variant="outlined" className="gradient-surface">
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  {c.icon}
                  <div>
                    <Typography fontWeight={700}>{c.title}</Typography>
                    <Chip
                      size="small"
                      label={c.status}
                      color={c.status === "active" ? "success" : "warning"}
                      variant="outlined"
                    />
                  </div>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined" className="gradient-surface">
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={1}>
            Posture
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Coverage across secrets, image scanning, and runtime hardening.
          </Typography>
          <Stack spacing={2}>
            <Bar label="Secrets managed in Vault" percent={86} />
            <Bar label="Images scanned (Trivy)" percent={92} />
            <Bar label="Non-root/read-only" percent={74} />
            <Bar label="Falco runtime policies" percent={61} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function Bar({ label, percent }) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="subtitle2" color="text.secondary">
          {percent}%
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={percent} />
    </Stack>
  );
}

export default Security;
