import { apiManager } from '@/app/apiManager';

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
  async getOffers(): Promise<PhysicalOffer[]> {
    return apiManager.get<PhysicalOffer[]>('/offers');
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
};
