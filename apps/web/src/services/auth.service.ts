import api from './api'

export interface RegisterPayload {
  email: string
  password: string
  first_name: string
  last_name: string
  role?: 'CONSUMER' | 'PRODUCER'
  gdpr_consent: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'CONSUMER' | 'PRODUCER' | 'ADMIN'
  phone?: string
  avatar_url?: string
  created_at: string
}

interface SessionResponse {
  user: User
  access_token: string
  refresh_token: string
}

export interface ProfileUpdate {
  first_name?: string
  last_name?: string
  phone?: string
}

export const authService = {
  register: (data: RegisterPayload) => api.post<SessionResponse>('/auth/register', data),

  login: (data: LoginPayload) => api.post<SessionResponse>('/auth/login', data),

  logout: (refreshToken: string) => api.post('/auth/logout', { refresh_token: refreshToken }),

  me: () => api.get<User>('/auth/me'),

  updateProfile: (data: ProfileUpdate) => api.patch<User>('/users/profile', data),

  changePassword: (current_password: string, new_password: string) =>
    api.put('/users/me/password', { current_password, new_password }),

  changeEmail: (current_password: string, new_email: string) =>
    api.put<User>('/users/me/email', { current_password, new_email }),

  exportData: () => api.get<Record<string, unknown>>('/users/me/export'),

  deleteAccount: () => api.delete('/users/me'),
}
