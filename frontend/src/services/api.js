// Configuración de URLs para los microservicios
export const API_URLS = {
  auth: 'http://localhost:3001',
  ventas: 'http://localhost:3002',
  inventario: 'http://localhost:3003'
};

// Configuración opcional si usas axios
// export const api = axios.create({ baseURL: API_URLS.auth });