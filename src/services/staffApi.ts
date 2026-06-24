import { supabase } from '@/integrations/supabase/client';
import { validateAndNormalizeSriLankanMobile } from '@/utils/phoneUtils';

interface StaffMember {
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
  is_active?: boolean;
}

export const staffApi = {
  async getStaff(params: StaffSearchParams = {}): Promise<PaginatedResponse<StaffMember>> {
    try {
      let query = supabase
        .from('members')
        .select(`
          *,
          companies (
            *
          ),
          customer_categories (
            name
          )
        `, { count: 'exact' });

      // Only get members that are not deleted
      query = query.or('is_deleted.eq.false,is_deleted.is.null');

      if (params.search) {
        query = query.or(`first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,mobile.ilike.%${params.search}%`);
      }

      if (params.company_id) {
        query = query.eq('company_id', params.company_id);
      }

      // Filter by active status if specified
      if (params.is_active !== undefined) {
        query = query.eq('is_active', params.is_active);
      }

      const limit = params.limit || 10;
      const page = params.page || 1;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message || 'Failed to fetch members');
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      // Transform data to include company_name and category_name
      const transformedData = (data || []).map((member: any) => ({
        ...member,
        company_name: member.companies?.name,
        company_phone: member.companies?.phone,
        company_address: member.companies?.address,
        company_email: member.companies?.email,
        company_manager_name: member.companies?.manager_name,
        category_name: member.customer_categories?.name,
        selected_offers: Array.isArray(member.selected_offers) ? member.selected_offers as string[] : [],
        member_code: member.member_code || 'N/A'
      }));

      return {
        data: transformedData,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching staff:', error);
      throw error;
    }
  },

  async registerStaff(staffData: Omit<StaffMember, 'id' | 'created_at'>): Promise<StaffMember> {
    try {
      const { data, error } = await supabase
        .from('members')
        .insert([{
          ...staffData,
          discount_amount: Number(staffData.discount_amount) || 0,
          discount_percentage: Number(staffData.discount_percentage) || 10,
          is_active: staffData.is_active ?? true,
          discount_enabled: staffData.discount_enabled ?? true,
          selected_offers: staffData.selected_offers || []
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to register member');
      }

      return {
        ...data,
        selected_offers: Array.isArray(data.selected_offers) ? data.selected_offers as string[] : []
      };
    } catch (error) {
      console.error('Error registering staff:', error);
      throw error;
    }
  },

  async updateStaff(id: string, staffData: Partial<Omit<StaffMember, 'id' | 'created_at'>>): Promise<StaffMember> {
    try {
      const { data, error } = await supabase
        .from('members')
        .update(staffData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to update member');
      }

      return {
        ...data,
        selected_offers: Array.isArray(data.selected_offers) ? data.selected_offers as string[] : []
      };
    } catch (error) {
      console.error('Error updating staff:', error);
      throw error;
    }
  },

  async getMemberByPhone(phone: string): Promise<StaffMember | null> {
    try {
      // Try to normalize the input phone number
      const phoneValidation = validateAndNormalizeSriLankanMobile(phone);
      const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : phone;
      
      // Search for phone in multiple formats to handle legacy data
      const searchFormats = [
        normalizedPhone,                    // 94771234567
        `+${normalizedPhone}`,              // +94771234567
        phone                                // Original input
      ];

      const { data, error } = await supabase
        .from('members')
        .select('*')
        .in('mobile', searchFormats)
        .eq('is_active', true)
        .or('is_deleted.eq.false,is_deleted.is.null')
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to fetch member');
      }

      if (!data) return null;

      return {
        ...data,
        selected_offers: Array.isArray(data.selected_offers) ? data.selected_offers as string[] : []
      };
    } catch (error) {
      console.error('Error fetching member by phone:', error);
      throw error;
    }
  },

  async getMemberByCode(code: string): Promise<StaffMember | null> {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('member_code', code)
        .eq('is_active', true)
        .or('is_deleted.eq.false,is_deleted.is.null')
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Failed to fetch member by code');
      }

      if (!data) return null;

      return {
        ...data,
        selected_offers: Array.isArray(data.selected_offers) ? data.selected_offers as string[] : []
      };
    } catch (error) {
      console.error('Error fetching member by code:', error);
      throw error;
    }
  },

  async deactivateStaff(id: string, note: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('members')
        .update({ is_active: false, deactivation_note: note })
        .eq('id', id);

      if (error) {
        throw new Error(error.message || 'Failed to deactivate member');
      }
    } catch (error) {
      console.error('Error deactivating staff:', error);
      throw error;
    }
  },

  async deleteStaff(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('members')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) {
        throw new Error(error.message || 'Failed to delete member');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  },
};
