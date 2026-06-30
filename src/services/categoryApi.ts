import { apiManager } from '@/app/apiManager';

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
