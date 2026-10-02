import { apiManager } from '@/app/apiManager';

export type ApplicationStatus = 'pending' | 'processing' | 'verified' | 'rejected';

export interface OwnerApplication {
  id: string;
  first_name: string;
  last_name?: string | null;
  mobile: string;
  email?: string | null;
  address?: string | null;
  district?: string | null;
  member_code?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: string | null;
  vehicle_number?: string | null;
  vehicle_images?: (string | { url?: string; path?: string })[];
  verification_status: ApplicationStatus;
  is_verified: boolean;
  is_active: boolean;
  admin_note?: string | null;
  registered_date?: string | null;
  created_at: string;
  category_id?: number | null;
  category_name?: string | null;
}

export interface ApplicationListResponse {
  data: OwnerApplication[];
  pagination: { total: number; totalPages: number; currentPage: number; limit: number; hasNextPage: boolean; hasPrevPage: boolean };
}

export interface RegistrationStatusResponse {
  status: ApplicationStatus;
  is_verified: boolean;
  message: string;
  member_code?: string;
  member_id?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  vehicle_number?: string;
  district?: string;
  vehicle_images?: (string | { url?: string; path?: string })[];
  admin_note?: string | null;
  reason?: string;
  has_password?: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7258/api';

export const getUploadUrl = (value: string | { url?: string; path?: string }) => {
  const path = typeof value === 'string' ? value.trim() : (value.url || value.path || '').trim();
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const host = API_BASE.replace(/\/api\/?$/, '');
  if (path.startsWith('/api/uploads/') || path.startsWith('/uploads/')) return `${host}${path}`;
  if (path.startsWith('/vehicles/')) return `${host}/uploads${path}`;
  return `${host}/uploads/vehicles/${path.replace(/^\/+/, '')}`;
};

export const applicationApi = {
  async requestOtp(mobile: string): Promise<{ message: string; masked_mobile?: string }> {
    return apiManager.post('/members/registration/send-otp', { mobile });
  },

  async verifyOtp(mobile: string, otp: string): Promise<{ verified: boolean }> {
    return apiManager.post('/members/registration/verify-otp', { mobile, otp });
  },

  async submit(application: FormData): Promise<{ reference: string; status: ApplicationStatus }> {
    return apiManager.post('/members/registration/submit', application, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  async getStatus(mobile: string): Promise<RegistrationStatusResponse> {
    return apiManager.get(`/members/registration/status/${encodeURIComponent(mobile)}`);
  },

  async getApplications(params: { status?: ApplicationStatus | 'all'; page?: number; limit?: number; search?: string } = {}): Promise<ApplicationListResponse> {
    const query = new URLSearchParams();
    query.set('status', params.status || 'pending');
    query.set('page', String(params.page || 1));
    query.set('limit', String(params.limit || 10));
    if (params.search) query.set('search', params.search);
    return apiManager.get(`/members/verifications?${query.toString()}`);
  },

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    note?: string,
    categoryId?: number
  ): Promise<{ success: boolean; message: string; member: OwnerApplication }> {
    return apiManager.put(`/members/${id}/verification-status`, { status, note, category_id: categoryId });
  },
};