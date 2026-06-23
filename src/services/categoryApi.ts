import { supabase } from '@/integrations/supabase/client';

interface CustomerCategory {
  id?: number;
  name: string;
  description: string;
  created_by: number;
}

export const categoryApi = {
  async getCategories(): Promise<CustomerCategory[]> {
    try {
      const { data, error } = await supabase
        .from('customer_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  async createCategory(category: Omit<CustomerCategory, 'id'>): Promise<CustomerCategory> {
    try {
      const { data, error } = await supabase
        .from('customer_categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  async updateCategory(id: number, category: Partial<Omit<CustomerCategory, 'id'>>): Promise<CustomerCategory> {
    try {
      const { data, error } = await supabase
        .from('customer_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  async deleteCategory(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('customer_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },
};
