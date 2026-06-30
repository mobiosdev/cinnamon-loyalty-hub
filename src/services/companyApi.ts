import { apiManager } from '@/app/apiManager';

export interface Company {
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
    const queryParams = new URLSearchParams();
    if (params.name) queryParams.append('name', params.name);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    return apiManager.get<Company[]>(`/companies?${queryParams.toString()}`);
  },

  async createCompany(companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    return apiManager.post<Company>('/companies', companyData);
  },

  async updateCompany(id: string, companyData: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>): Promise<Company> {
    return apiManager.put<Company>(`/companies/${id}`, companyData);
  }
};
