import { apiManager } from '@/app/apiManager';
import { buildListQuery, ListParams, PaginatedResponse } from './pagination';

export interface CustomerCategory {
  id?: number;
  name: string;
  description: string;
  created_by: number;
  valid_from?: string | null;
  valid_to?: string | null;
}

export const categoryApi = {
  async getCategories(): Promise<CustomerCategory[]> {
    return apiManager.get<CustomerCategory[]>('/categories');
  },

  async getCategoriesPaginated(params: ListParams): Promise<PaginatedResponse<CustomerCategory>> {
    return apiManager.get<PaginatedResponse<CustomerCategory>>(`/categories${buildListQuery(params)}`);
  },

  async createCategory(category: Omit<CustomerCategory, 'id'>): Promise<CustomerCategory> {
    return apiManager.post<CustomerCategory>('/categories', category);
  },

  async updateCategory(id: number, category: Partial<Omit<CustomerCategory, 'id'>>): Promise<CustomerCategory> {
    return apiManager.put<CustomerCategory>(`/categories/${id}`, category);
  },

  async deleteCategory(id: number): Promise<void> {
    return apiManager.delete<void>(`/categories/${id}`);
  },
};
