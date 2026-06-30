import { apiManager } from '@/app/apiManager';

export interface DiscountRedemption {
  id?: string;
  member_id: string;
  bill_number: string;
  customer_phone: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number | null;
  redeemed_by: number;
  redeemed_at?: string;
}

export interface Transaction {
  id: string;
  bill_number: string;
  customer_phone: string;
  member_name: string;
  company_name: string;
  category_name: string;
  discount_amount: number;
  discount_type: string;
  discount_value: number;
  redeemed_at: string;
  type: 'discount' | 'offer';
  offer_name?: string;
}

interface TransactionFilters {
  categoryFilter?: string;
  offerFilter?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
}

export const redemptionApi = {
  async redeemDiscount(data: Omit<DiscountRedemption, 'id' | 'redeemed_at'>): Promise<DiscountRedemption> {
    return apiManager.post<DiscountRedemption>('/redemptions/discount', data);
  },

  async getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const queryParams = new URLSearchParams();
    if (filters.categoryFilter && filters.categoryFilter !== 'all') {
      queryParams.append('categoryFilter', filters.categoryFilter);
    }
    if (filters.offerFilter && filters.offerFilter !== 'all') {
      queryParams.append('offerFilter', filters.offerFilter);
    }
    if (filters.searchTerm) {
      queryParams.append('searchTerm', filters.searchTerm);
    }
    if (filters.dateFrom) {
      queryParams.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      queryParams.append('dateTo', filters.dateTo);
    }

    return apiManager.get<Transaction[]>(`/redemptions/transactions?${queryParams.toString()}`);
  },

  async getReportData(filters: ReportFilters = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (filters.dateFrom) {
      queryParams.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      queryParams.append('dateTo', filters.dateTo);
    }

    return apiManager.get<any>(`/redemptions/report?${queryParams.toString()}`);
  },
};
