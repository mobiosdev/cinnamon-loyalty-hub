import { supabase } from '@/integrations/supabase/client';

interface Company {
  id?: string;
  company_code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface CompanySearchParams {
  name?: string;
  page?: number;
  limit?: number;
}

export const companyApi = {
  async searchCompanies(params: CompanySearchParams = {}): Promise<Company[]> {
    try {
      let query = supabase
        .from('companies')
        .select('*')
        .order('name');

      if (params.name) {
        query = query.ilike('name', `%${params.name}%`);
      }

      if (params.limit) {
        const from = params.page ? (params.page - 1) * params.limit : 0;
        const to = from + params.limit - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch companies: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }
  },

  async createCompany(companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([companyData])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create company: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  },

  async updateCompany(id: string, companyData: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>): Promise<Company> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update company: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }
};
