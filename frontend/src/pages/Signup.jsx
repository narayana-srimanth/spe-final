import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

function Signup() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        p: 2,
      }}
      className="fade-in"
    >
      <Card sx={{ maxWidth: 460, width: "100%", boxShadow: 8 }} className="gradient-surface">
        <CardContent>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <div>
              <Typography variant="h5" fontWeight={800}>
                Create your account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Provision secure access to the command console.
              </Typography>
            </div>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="First name" required fullWidth />
              <TextField label="Last name" required fullWidth />
            </Stack>
            <TextField label="Email" type="email" required fullWidth />
            <TextField label="Password" type="password" required fullWidth />
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<PersonAddIcon />}
            >
              Sign Up
            </Button>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{" "}
              <RouterLink to="/login" style={{ fontWeight: 700 }}>
                Log in
              </RouterLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Signup;
