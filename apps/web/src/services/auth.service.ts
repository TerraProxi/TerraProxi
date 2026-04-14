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

export const authService = {
  register: (data: RegisterPayload) =>
    api.post<{ user: User; access_token: string }>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<{ user: User; access_token: string }>('/auth/login', data),

  me: () => api.get<User>('/auth/me'),

  updateProfile: (data: Partial<User>) => api.patch<User>('/users/profile', data),

  deleteAccount: () => api.delete('/users/me'),
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
