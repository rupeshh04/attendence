import axios from "axios";

// In the browser, use a relative path (/api) so Next.js rewrites proxy the
// request to the Express backend — avoids CORS and port-mismatch 404s.
// Falls back to the absolute URL for SSR or when the proxy isn't available.
const API_BASE_URL =
  typeof window !== "undefined"
    ? "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const loginUser = (credentials) => api.post("/auth/login", credentials);
export const registerAdmin = (data) => api.post("/auth/register", data);
export const getMe = () => api.get("/auth/me");

// ── Employee (Admin) ──────────────────────────────────────────────────────────
export const createEmployee = (data) =>
  api.post("/auth/create-employee", data);
export const getEmployees = () => api.get("/auth/employees");
export const updateEmployee = (id, data) =>
  api.put(`/auth/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/auth/employees/${id}`);

// ── Attendance ────────────────────────────────────────────────────────────────
export const markAttendance = (data) => api.post("/attendance/mark", data);
export const checkoutAttendance = (data) => api.post("/attendance/checkout", data);
export const getMyAttendance = (page = 1, filters = {}) => {
  const params = new URLSearchParams({ page, limit: 20, ...filters }).toString();
  return api.get(`/attendance/my?${params}`);
};
export const getTodayStatus = () => api.get("/attendance/today-status");

// ── Admin Attendance ──────────────────────────────────────────────────────────
export const getAllAttendance = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/attendance/all?${query}`);
};
export const updateAttendance = (id, data) => api.put(`/attendance/${id}`, data);
export const deleteAttendance = (id) => api.delete(`/attendance/${id}`);
export const exportAttendance = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/attendance/export?${query}`);
};
export const getAttendanceStats = () => api.get("/attendance/stats");

export default api;
