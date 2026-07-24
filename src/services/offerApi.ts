import { apiManager } from '@/app/apiManager';
import { buildListQuery, ListParams, PaginatedResponse } from './pagination';

export interface PhysicalOffer {
  id?: string;
  name: string;
  description: string;
  category_id: number;
  is_active: boolean;
  valid_from: string;
  valid_to: string;
  created_at?: string;
  category_name?: string;
  min_bill_value?: number;
  max_discount_amount?: number;
  is_recurrent?: boolean;
  usage_limit?: number | null;
  category_ids?: number[];
  category_recurrence?: Record<number, {
    is_recurrent: boolean;
    hasUsageLimit: boolean;
    usage_limit: string;
  }>;
}

export interface OfferRedemption {
  id?: string;
  offer_id: string;
  customer_phone: string;
  redeemed_at?: string;
  redeemed_by: number;
  bill_number?: string;
  offer_name?: string;
}

export interface AvailableOffer {
  id: string;
  name: string;
  description: string;
  is_redeemed: boolean;
  min_bill_value?: number;
  max_discount_amount?: number;
}

export interface AvailableOffersResponse {
  member: {
    id: string;
    first_name: string;
    last_name: string;
    mobile: string;
    member_code: string;
    category_id: number;
  } | null;
  offers: AvailableOffer[];
}

const METADATA_PREFIX = '\n\n[Recurrence Settings: ';
const METADATA_SUFFIX = ']';

export const parseOfferDescription = (rawDescription: string | null) => {
  if (!rawDescription) return { description: '', category_recurrence: {} };
  
  const startIndex = rawDescription.indexOf(METADATA_PREFIX);
  if (startIndex === -1) {
    return { description: rawDescription, category_recurrence: {} };
  }
  
  const endIndex = rawDescription.indexOf(METADATA_SUFFIX, startIndex + METADATA_PREFIX.length);
  if (endIndex === -1) {
    return { description: rawDescription, category_recurrence: {} };
  }
  
  const jsonStr = rawDescription.substring(startIndex + METADATA_PREFIX.length, endIndex);
  try {
    const category_recurrence = JSON.parse(jsonStr);
    const description = rawDescription.substring(0, startIndex);
    return { description, category_recurrence };
  } catch (e) {
    console.error('Error parsing offer recurrence metadata:', e);
    return { description: rawDescription, category_recurrence: {} };
  }
};

export const serializeOfferDescription = (description: string, category_recurrence: Record<number, any>) => {
  const jsonStr = JSON.stringify(category_recurrence);
  return `${description}${METADATA_PREFIX}${jsonStr}${METADATA_SUFFIX}`;
};

export const offerApi = {
  async getOffers(search?: string): Promise<PhysicalOffer[]> {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return apiManager.get<PhysicalOffer[]>(`/offers${query}`);
  },

  async getOffersPaginated(params: ListParams & { status?: 'active' | 'past' }): Promise<PaginatedResponse<PhysicalOffer>> {
    const queryParams = new URLSearchParams(buildListQuery(params).replace(/^\?/, ''));
    if (params.status) queryParams.append('status', params.status);
    return apiManager.get<PaginatedResponse<PhysicalOffer>>(`/offers?${queryParams.toString()}`);
  },

  async createOffer(offer: Omit<PhysicalOffer, 'id' | 'created_at'> & { category_ids?: number[] }): Promise<PhysicalOffer> {
    return apiManager.post<PhysicalOffer>('/offers', offer);
  },

  async updateOffer(id: string, offer: Partial<PhysicalOffer> & { category_ids?: number[] }): Promise<PhysicalOffer> {
    return apiManager.put<PhysicalOffer>(`/offers/${id}`, offer);
  },

  async getAvailableOffers(search: string): Promise<AvailableOffersResponse> {
    return apiManager.get<AvailableOffersResponse>(`/offers/available?search=${encodeURIComponent(search)}`);
  },

  async redeemOffer(redemption: Omit<OfferRedemption, 'id' | 'redeemed_at'>): Promise<OfferRedemption> {
    return apiManager.post<OfferRedemption>('/offers/redeem', redemption);
  },

  async redeemOfferBatch(payload: {
    offer_ids: string[];
    customer_phone: string;
    bill_number: string;
    redeemed_by?: number;
  }): Promise<OfferRedemption[]> {
    return apiManager.post<OfferRedemption[]>('/offers/redeem-batch', payload);
  },

  async getRedemptions(): Promise<OfferRedemption[]> {
    return apiManager.get<OfferRedemption[]>('/offers/redemptions');
  },

  async getOffersByCategory(categoryId: number): Promise<PhysicalOffer[]> {
    return apiManager.get<PhysicalOffer[]>(`/offers/category/${categoryId}`);
  },

  async getOfferCategories(offerId: string): Promise<number[]> {
    return apiManager.get<number[]>(`/offers/${offerId}/categories`);
  },

  async reactivateOffer(redemptionId: string, reactivatedBy: string = 'Admin User'): Promise<void> {
    return apiManager.post<void>('/offers/reactivate', {
      redemption_id: redemptionId,
      reactivated_by: reactivatedBy,
    });
  },

  async getActiveRedemptions(phone: string, offerId: string): Promise<any[]> {
    return apiManager.get<any[]>(
      `/offers/active-redemptions?phone=${encodeURIComponent(phone)}&offer_id=${offerId}`
    );
  },

  async deleteOffer(id: string): Promise<void> {
    return apiManager.delete<void>(`/offers/${id}`);
  },

  async assignToMembers(payload: { offer_id: string; category_ids: number[] }): Promise<void> {
    return apiManager.post<void>('/offers/assign-to-members', payload);
  },

  async fixMemberOffers(): Promise<any> {
    return apiManager.post<any>('/offers/fix-member-offers');
  },

  async requestReversal(billNumber: string): Promise<any> {
    return apiManager.post<any>('/offers/reverse/request', { bill_number: billNumber });
  },

  async confirmReversal(payload: { bill_number: string; otp: string; staff_id: number }): Promise<any> {
    return apiManager.post<any>('/offers/reverse/confirm', payload);
  },
};
