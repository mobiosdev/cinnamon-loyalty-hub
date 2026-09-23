import { apiManager } from '@/app/apiManager';

export interface StaffMember {
  id?: string;
  company_id?: string;
  title?: string;
  first_name: string;
  last_name: string;
  mobile: string;
  secondary_mobile?: string;
  email?: string;
  secondary_email?: string;
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

export interface PortalOffer {
  id: string;
  name: string;
  description: string;
  valid_from?: string;
  valid_to?: string;
  min_bill_value: number | null;
  max_discount_amount: number | null;
  is_recurrent: boolean;
  usage_limit: number | null;
  redemptions_count: number;
  remaining_uses: number | null;
  is_redeemed: boolean;
  redemptions: { id: string; redeemed_at: string; bill_number: string | null }[];
}

export interface PortalRedemption {
  id: string;
  type: 'discount' | 'offer';
  title: string;
  bill_number: string | null;
  redeemed_at: string;
  discount_type: string | null;
  discount_value: number | null;
  discount_amount: number | null;
  status: string;
}

export interface MemberPortalData {
  member: StaffMember & Record<string, any>;
  privilege_discount: {
    enabled: boolean;
    percentage: number | null;
    amount: number | null;
    policy?: string;
  };
  offers: PortalOffer[];
  history: PortalRedemption[];
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
  mobile?: string;
  member_code?: string;
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
    if (params.mobile) queryParams.append('mobile', params.mobile);
    if (params.member_code) queryParams.append('member_code', params.member_code);
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

  async getMemberById(id: string): Promise<StaffMember | null> {
    try {
      return await apiManager.get<StaffMember>(`/members/${id}`);
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async getMemberPortalData(memberId: string): Promise<MemberPortalData> {
    return apiManager.get<MemberPortalData>(`/members/${memberId}/portal-data`);
  },

  async sendCardEmail(id: string, email: string, cardUrl?: string): Promise<any> {
    return apiManager.post<any>(`/members/${id}/send-card`, { email, card_url: cardUrl });
  },

  async dispatchCard(id: string, cardUrl?: string): Promise<any> {
    return apiManager.post<any>(`/members/${id}/dispatch-card`, { card_url: cardUrl });
  },

  async getPublicCard(idOrCode: string): Promise<any> {
    return apiManager.get<any>(`/members/card/${encodeURIComponent(idOrCode)}`);
  },

  async validateBulkImport(members: any[], companyId?: string): Promise<{
    success: number;
    failed: number;
    errors: { rowName: string; error: string; index: number }[];
  }> {
    return apiManager.post('/members/bulk-validate', { members, company_id: companyId });
  },

  async bulkImport(membersList: any[], uploadCategoryId?: number, companyId?: string): Promise<Response> {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7257/api';
    return fetch(`${apiBase}/members/bulk-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        members: membersList,
        category_id: uploadCategoryId,
        company_id: companyId
      })
    });
  },

  async verifyPasswordToken(token: string): Promise<any> {
    return apiManager.get<any>(`/members/auth/verify-token?token=${encodeURIComponent(token)}`);
  },

  async setPassword(token: string, new_password: string): Promise<any> {
    return apiManager.post<any>('/members/auth/set-password', { token, new_password });
  },

  async sendPasswordResetEmail(memberId: string): Promise<any> {
    return apiManager.post<any>(`/members/${memberId}/send-password-reset-email`, {});
  },

  async customerLogin(email: string, password: string, send_to_secondary: boolean = false): Promise<any> {
    return apiManager.post<any>('/members/auth/customer/login', {
      email,
      password,
      send_to_secondary,
    });
  },

  async verifyCustomerOtp(member_id: string, otp: string): Promise<any> {
    return apiManager.post<any>('/members/auth/customer/login/verify', {
      member_id,
      otp,
    });
  },
};

