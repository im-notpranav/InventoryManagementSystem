import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const API = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

API.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('inventbot_token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const login = (data) => API.post('/auth/login', data)
export const register = (data) => API.post('/auth/register', data)

export default API
