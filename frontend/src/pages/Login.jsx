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
import LoginIcon from "@mui/icons-material/Login";
import { useState } from "react";

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await onLogin(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid credentials");
    }
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
      <Card sx={{ maxWidth: 420, width: "100%", boxShadow: 8 }} className="gradient-surface">
        <CardContent>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <div>
              <Typography variant="h5" fontWeight={800}>
                Welcome back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to the SentinelCare command console.
              </Typography>
            </div>
            <TextField
              label="Email"
              type="email"
              required
              fullWidth
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label="Password"
              type="password"
              required
              fullWidth
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
            >
              Sign In For Checking deployment.
            </Button>
            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              No account?{" "}
              <RouterLink to="/signup" style={{ fontWeight: 700 }}>
                Create one
              </RouterLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;
