import { apiManager } from '@/app/apiManager';

export interface StaffMember {
  id?: string;
  company_id?: string;
  title?: string;
  first_name: string;
  last_name: string;
  mobile: string;
  email?: string;
  address?: string;
  date_of_birth?: string;
  deactivation_note?: string;
  designation?: string;
  category_id?: number;
  registered_date?: string;
  renew_date?: string;
  discount_percentage?: number;
  discount_amount?: number;
  discount_policy?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  created_at?: string;
  company_name?: string;
  category_name?: string;
  discount_enabled?: boolean;
  selected_offers?: string[];
  member_code?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface StaffSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  company_id?: string;
  category_id?: string;
  is_active?: boolean;
}

export const staffApi = {
  async getStaff(params: StaffSearchParams = {}): Promise<PaginatedResponse<StaffMember>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.company_id) queryParams.append('company_id', params.company_id);
    if (params.category_id) queryParams.append('category_id', params.category_id);
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

    return apiManager.get<PaginatedResponse<StaffMember>>(`/members?${queryParams.toString()}`);
  },

  async registerStaff(staffData: Omit<StaffMember, 'id' | 'created_at'>): Promise<StaffMember> {
    return apiManager.post<StaffMember>('/members', staffData);
  },

  async updateStaff(id: string, staffData: Partial<Omit<StaffMember, 'id' | 'created_at'>>): Promise<StaffMember> {
    return apiManager.put<StaffMember>(`/members/${id}`, staffData);
  },

  async deleteStaff(id: string): Promise<void> {
    return apiManager.delete<void>(`/members/${id}`);
  },

  async getMemberByPhone(phone: string): Promise<StaffMember | null> {
    try {
      return await apiManager.get<StaffMember>(`/members/phone/${encodeURIComponent(phone)}`);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async getMemberByCode(code: string): Promise<StaffMember | null> {
    try {
      return await apiManager.get<StaffMember>(`/members/code/${encodeURIComponent(code)}`);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
