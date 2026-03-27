import axios, { AxiosError, type AxiosInstance } from 'axios'
import Cookies from 'js-cookie'

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach Bearer token if cookie is present
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — on 401 redirect to login
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      Cookies.remove('accessToken')
      if (typeof window !== 'undefined') {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?redirect=${redirect}`
      }
    }
    return Promise.reject(error)
  }
)

// ---------------------------------------------------------------------------
// Types (inline — real canonical types live in @arivarangam/types)
// ---------------------------------------------------------------------------

export interface AuthLoginPayload {
  email: string
  password: string
}

export interface AuthSignupPayload {
  name: string
  email: string
  password: string
}

export interface SignupResponse {
  success: boolean
  data: {
    message: string
    email: string
  }
}

export interface User {
  id: string
  name: string
  email: string
  tier: string
  role?: 'user' | 'admin'
  avatarUrl?: string
  credits: number
  isAdmin: boolean
  isEmailVerified: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuthResponse {
  success: boolean
  data: {
    token: string
    user: User
  }
}

export interface TaskCreatePayload {
  prompt: string
  category: string
  repoId?: string
  context?: string
}


export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled'

export interface Task {
  id: string
  status: TaskStatus
  prompt: string
  category: string
  creditsUsed: number
  previewUrl?: string
  repoId?: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface TaskFile {
  path: string
  content: string
  language: string
}

export interface Repo {
  id: string
  name: string
  description?: string
  language?: string
  isPublic: boolean
  ownerId: string
  deployUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CreditEstimate {
  min: number
  max: number
  typical: number
}

export interface CreditPack {
  id: string
  name: string
  credits: number
  priceInPaise: number
  popular?: boolean
}

export interface CreditOrder {
  orderId: string
  amount: number
  currency: string
  keyId: string
}

export interface Transaction {
  id: string
  type: 'purchase' | 'usage'
  credits: number
  amount?: number
  description: string
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminUser extends User {
  creditBalance: number
  taskCount: number
  lastLoginAt?: string
}

export interface AdminTask extends Task {
  user: { id: string; name: string; email: string }
}

export interface PlatformLog {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  meta?: Record<string, unknown>
  service?: string
  createdAt: string
}

export interface BillingStats {
  totalRevenue: number
  totalCreditsIssued: number
  totalCreditsUsed: number
  activeUsers: number
  revenueByDay: { date: string; amount: number }[]
  totalOrders: number
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function getApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string; message?: string } | undefined
    if (data?.error) return data.error
    if (data?.message) return data.message
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred.'
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  login: (payload: AuthLoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload).then((r) => r.data),

  signup: (payload: AuthSignupPayload) =>
    api.post<SignupResponse>('/auth/signup', payload).then((r) => r.data),

  resendVerification: (email: string) =>
    api.post<{ success: boolean; data: { message: string } }>('/auth/resend-verification', { email }).then((r) => r.data),

  logout: () => api.post<void>('/auth/logout').then((r) => r.data),

  me: () =>
    api
      .get<{ success: boolean; data: { user: User } }>('/auth/me')
      .then((r) => r.data.data.user),

  adminOtpSend: (payload: AuthLoginPayload) =>
    api.post<{ success: boolean; data: { message: string } }>('/auth/admin-otp-send', payload).then((r) => r.data),

  adminOtpVerify: (payload: { email: string; otp: string }) =>
    api.post<AuthResponse>('/auth/admin-otp-verify', payload).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    api
      .post<{ message: string }>('/auth/reset-password', { token, password })
      .then((r) => r.data),

  verifyEmail: (token: string) =>
    api.post<{ message: string }>('/auth/verify-email', { token }).then((r) => r.data),

  updateProfile: (data: { name?: string }) =>
    api
      .patch<{ success: boolean; data: { user: User } }>('/auth/me', data)
      .then((r) => r.data.data.user),

  uploadAvatar: (data: string, mimeType: string) =>
    api
      .post<{ success: boolean; data: { user: User } }>('/auth/me/avatar', { data, mimeType })
      .then((r) => r.data.data.user),

  changePassword: (oldPassword: string, newPassword: string) =>
    api
      .post<{ message: string }>('/auth/me/change-password', { oldPassword, newPassword })
      .then((r) => r.data),
}

// ---------------------------------------------------------------------------
// Tasks API
// ---------------------------------------------------------------------------

export const tasksApi = {
  create: (payload: TaskCreatePayload) =>
    api.post<Task>('/tasks', payload).then((r) => r.data),

  list: (params?: { page?: number; limit?: number; status?: string; category?: string }) =>
    api.get<PaginatedResponse<Task>>('/tasks', { params }).then((r) => r.data),

  get: (taskId: string) => api.get<Task>(`/tasks/${taskId}`).then((r) => r.data),

  cancel: (taskId: string) =>
    api.post<Task>(`/tasks/${taskId}/cancel`).then((r) => r.data),

  followUp: (taskId: string, prompt: string) =>
    api.post<Task>(`/tasks/${taskId}/follow-up`, { prompt }).then((r) => r.data),

  deletePermanent: (taskId: string) =>
    api.delete<void>(`/tasks/${taskId}/permanent`).then((r) => r.data),

  getFiles: (taskId: string) =>
    api.get<TaskFile[]>(`/tasks/${taskId}/files`).then((r) => r.data),
}

// ---------------------------------------------------------------------------
// Repos API
// ---------------------------------------------------------------------------

export const reposApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Repo>>('/repos', { params }).then((r) => r.data),

  get: (repoId: string) => api.get<Repo>(`/repos/${repoId}`).then((r) => r.data),

  create: (payload: Pick<Repo, 'name'> & Partial<Omit<Repo, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>) =>
    api.post<Repo>('/repos', payload).then((r) => r.data),

  update: (
    repoId: string,
    payload: Partial<Pick<Repo, 'name' | 'description' | 'isPublic' | 'deployUrl'>>
  ) => api.patch<Repo>(`/repos/${repoId}`, payload).then((r) => r.data),

  saveVersion: (repoId: string, message: string) =>
    api
      .post<{ versionId: string }>(`/repos/${repoId}/save`, { message })
      .then((r) => r.data),

  delete: (repoId: string) => api.delete<void>(`/repos/${repoId}`).then((r) => r.data),
}

// ---------------------------------------------------------------------------
// Credits API
// ---------------------------------------------------------------------------

export const creditsApi = {
  getBalance: () =>
    api
      .get('/credits/balance')
      .then((r) => (r.data as any).data as { balance: number; recentTransactions: Transaction[] }),

  estimateTask: (prompt: string, category: string) =>
    api
      .post('/credits/estimate', { prompt, category })
      .then((r) => (r.data as any).data.estimate as CreditEstimate),

  getPacks: () =>
    api
      .get('/credits/packs')
      .then((r) => ((r.data as any).data?.packs ?? []) as CreditPack[]),

  createOrder: (packId: string) =>
    api
      .post('/credits/purchase/create-order', { packId })
      .then((r) => (r.data as any).data as CreditOrder),

  verifyPayment: (payload: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) =>
    api
      .post('/credits/purchase/verify', {
        orderId: payload.razorpay_order_id,
        paymentId: payload.razorpay_payment_id,
        signature: payload.razorpay_signature,
      })
      .then((r) => (r.data as any).data),

  getTransactions: (params?: { page?: number; limit?: number }) =>
    api
      .get('/credits/transactions', { params })
      .then((r) => {
        const d = (r.data as any).data ?? {}
        return {
          data: (d.transactions ?? []) as Transaction[],
          total: d.total ?? 0,
          page: d.page ?? 1,
          limit: d.limit ?? 20,
          totalPages: d.totalPages ?? 1,
        } as PaginatedResponse<Transaction>
      }),
}

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------

export const adminApi = {
  // Users
  listUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<AdminUser>>('/admin/users', { params }).then((r) => r.data),

  getUser: (userId: string) =>
    api.get<AdminUser>(`/admin/users/${userId}`).then((r) => r.data),

  updateUser: (userId: string, payload: Partial<Pick<AdminUser, 'name' | 'email' | 'role'>>) =>
    api.patch<AdminUser>(`/admin/users/${userId}`, payload).then((r) => r.data),

  deleteUser: (userId: string) =>
    api.delete<void>(`/admin/users/${userId}`).then((r) => r.data),

  adjustCredits: (userId: string, amount: number, reason: string) =>
    api
      .post<{ newBalance: number }>(`/admin/users/${userId}/credits`, { amount, reason })
      .then((r) => r.data),

  // Tasks
  listTasks: (params?: { page?: number; limit?: number; status?: string; userId?: string }) =>
    api.get<PaginatedResponse<AdminTask>>('/admin/tasks', { params }).then((r) => r.data),

  cancelTask: (taskId: string) =>
    api.post<AdminTask>(`/admin/tasks/${taskId}/cancel`).then((r) => r.data),

  // Platform logs
  getLogs: (params?: { page?: number; limit?: number; level?: string }) =>
    api.get<PaginatedResponse<PlatformLog>>('/admin/logs', { params }).then((r) => r.data),

  // Billing stats
  getBillingStats: (params?: { from?: string; to?: string }) =>
    api.get<BillingStats>('/admin/billing/stats', { params }).then((r) => r.data),
}

export default api
