const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8001";

let token = localStorage.getItem("sc_token") || "";

export function setToken(newToken) {
  token = newToken || "";
  if (token) localStorage.setItem("sc_token", token);
  else localStorage.removeItem("sc_token");
}

export function getToken() {
  return token;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json();
}

export const api = {
  login: async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || "Login failed");
    }
    const data = await res.json();
    setToken(data.access_token);
    return data;
  },
  fetchAlerts: () => request("/alerts"),
  fetchPatients: () => request("/patients"),
  createPatient: (payload) =>
    request("/patients", { method: "POST", body: JSON.stringify(payload) }),
  updatePatientMonitoring: (patientId, isMonitoring) =>
    request(`/patients/${patientId}/monitor?isMonitoring=${isMonitoring}`, {
      method: "PATCH",
    }),
  fetchTasks: (params = {}) =>
    request(`/tasks${params.patient_id ? `?patient_id=${params.patient_id}` : ""}`),
  createTask: (payload) =>
    request("/tasks", { method: "POST", body: JSON.stringify(payload) }),
  updateTask: (taskId, payload) =>
    request(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  fetchAudit: () => request("/audit?limit=100"),
  getNotificationPrefs: () => request("/notifications/prefs"),
  setNotificationPrefs: (payload) =>
    request("/notifications/prefs", { method: "POST", body: JSON.stringify(payload) }),
  score: (payload) =>
    request("/scoring/risk", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  simulate: ({ patient_id, risk }) =>
    request(`/simulate/run?patient_id=${patient_id}&risk=${risk}`, {
      method: "POST",
    }),
  health: () => request("/health"),
};
