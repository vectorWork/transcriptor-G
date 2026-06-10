import axios from 'axios';

// Cliente HTTP central. Usa el proxy de Vite (/api -> backend) y envía cookies.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Endpoints agrupados por dominio.
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  listar: () => api.get('/users'),
  crear: (data) => api.post('/users', data),
  actualizar: (id, data) => api.patch(`/users/${id}`, data),
};

export const gacetasApi = {
  // Transcriptor: gaceta activa o siguiente de la cola
  actual: () => api.get('/gacetas/actual'),
  // Admin: listado con filtros (estado, asignadoA)
  listar: (params) => api.get('/gacetas', { params }),
  obtener: (id) => api.get(`/gacetas/${id}`),
  editarMetadatos: (id, data) => api.patch(`/gacetas/${id}`, data),
  marcarVisto: (id, pagina) => api.post(`/gacetas/${id}/visto`, { pagina }),
  guardarMarcador: (id, pagina) => api.post(`/gacetas/${id}/marcador`, { pagina }),
  finalizar: (id) => api.post(`/gacetas/${id}/finalizar`),
  reasignar: (id, destino) => api.post(`/gacetas/${id}/reasignar`, { destino }),
  fileUrl: (id) => `/api/gacetas/${id}/file`,
  exportUrl: (id) => `/api/gacetas/${id}/export`,
  eliminar: (id) => api.delete(`/gacetas/${id}`),
};

export const statsApi = {
  dashboard: (params) => api.get('/stats/dashboard', { params }),
};

export const registrosApi = {
  listar: (gacetaId) => api.get('/registros', { params: { gacetaId } }),
  crear: (data) => api.post('/registros', data),
  editar: (id, data) => api.patch(`/registros/${id}`, data),
  eliminar: (id) => api.delete(`/registros/${id}`),
};

export const logsApi = {
  listar: (params) => api.get('/logs', { params }),
};
