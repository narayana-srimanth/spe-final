import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";

function StatCard({ title, value, delta, color = "primary" }) {
  return (
    <Card elevation={0} variant="outlined" sx={{ borderColor: "#e2e8f0" }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="baseline" mt={1}>
          <Typography variant="h4" fontWeight={800}>
            {value}
          </Typography>
          {delta && (
            <Chip
              size="small"
              color={color}
              label={delta}
              variant="filled"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default StatCard;
