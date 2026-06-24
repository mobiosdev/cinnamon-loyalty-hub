import { supabase } from '@/integrations/supabase/client';
import { validateAndNormalizeSriLankanMobile } from '@/utils/phoneUtils';

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
  category_recurrence?: Record<number, {
    is_recurrent: boolean;
    hasUsageLimit: boolean;
    usage_limit: string;
  }>;
}

interface OfferRedemption {
  id?: string;
  offer_id: string;
  customer_phone: string;
  redeemed_at?: string;
  redeemed_by: number;
  bill_number?: string;
  offer_name?: string;
}

interface AvailableOffer {
  id: string;
  name: string;
  description: string;
  is_redeemed: boolean;
  min_bill_value?: number;
  max_discount_amount?: number;
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
    try {
      const { data: offers, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch categories for each offer
      const offersWithCategories = await Promise.all(
        (offers || []).map(async (offer) => {
          const { data: offerCategories } = await supabase
            .from('offer_categories')
            .select(`
              category_id,
              customer_categories (
                name
              )
            `)
            .eq('offer_id', offer.id);

          const categoryNames = (offerCategories || [])
            .map((oc: any) => oc.customer_categories?.name)
            .filter(Boolean)
            .join(', ');

          const { description, category_recurrence } = parseOfferDescription(offer.description);

          return {
            ...offer,
            description,
            category_recurrence,
            category_name: categoryNames || 'No category'
          };
        })
      );

      return offersWithCategories;
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  },

  async createOffer(offer: Omit<PhysicalOffer, 'id' | 'created_at'> & { category_ids?: number[] }): Promise<PhysicalOffer> {
    try {
      const { category_ids, ...offerData } = offer;
      
      const { data, error } = await supabase
        .from('offers')
        .insert([offerData])
        .select()
        .single();

      if (error) throw error;

      // Insert category associations if provided
      if (category_ids && category_ids.length > 0 && data.id) {
        const categoryInserts = category_ids.map(categoryId => ({
          offer_id: data.id,
          category_id: categoryId
        }));

        const { error: categoryError } = await supabase
          .from('offer_categories')
          .insert(categoryInserts);

        if (categoryError) {
          console.error('Error inserting offer categories:', categoryError);
          throw new Error('Failed to assign offer categories');
        }
      }

      const { description, category_recurrence } = parseOfferDescription(data.description);

      return {
        ...data,
        description,
        category_recurrence
      };
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  },

  async updateOffer(id: string, offer: Partial<PhysicalOffer> & { category_ids?: number[] }): Promise<PhysicalOffer> {
    try {
      const { category_ids, ...offerData } = offer;
      
      const { data, error } = await supabase
        .from('offers')
        .update(offerData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update category associations if provided
      if (category_ids !== undefined) {
        // Delete existing associations
        await supabase
          .from('offer_categories')
          .delete()
          .eq('offer_id', id);

        // Insert new associations
        if (category_ids.length > 0) {
          const categoryInserts = category_ids.map(categoryId => ({
            offer_id: id,
            category_id: categoryId
          }));

          const { error: categoryError } = await supabase
            .from('offer_categories')
            .insert(categoryInserts);

          if (categoryError) {
            console.error('Error updating offer categories:', categoryError);
            throw new Error('Failed to update offer categories');
          }
        }
      }

      const { description, category_recurrence } = parseOfferDescription(data.description);

      return {
        ...data,
        description,
        category_recurrence
      };
    } catch (error) {
      console.error('Error updating offer:', error);
      throw error;
    }
  },

  async getAvailableOffers(phone: string): Promise<AvailableOffer[]> {
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

      // First, get the member by phone number
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('selected_offers, discount_enabled, mobile, category_id')
        .in('mobile', searchFormats)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!member) return [];

      const selectedOffers = Array.isArray(member.selected_offers) ? member.selected_offers as string[] : [];
      
      // If no offers are selected, return empty array
      if (selectedOffers.length === 0) return [];

      // Get the selected offers
      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .in('id', selectedOffers)
        .eq('is_active', true)
        .gte('valid_to', new Date().toISOString().split('T')[0]);

      if (offersError) throw offersError;

      // Get ACTIVE redemptions for this phone - only count non-cancelled redemptions
      const { data: redemptions, error: redemptionsError } = await supabase
        .from('offer_redemptions')
        .select('offer_id')
        .in('customer_phone', searchFormats)
        .eq('status', 'active');

      if (redemptionsError) throw redemptionsError;

      // Group active redemptions by offer_id to get the count
      const redemptionCounts: Record<string, number> = {};
      if (redemptions) {
        for (const r of redemptions) {
          if (r.offer_id) {
            redemptionCounts[r.offer_id] = (redemptionCounts[r.offer_id] || 0) + 1;
          }
        }
      }

      return (offers || []).map(offer => {
        const count = redemptionCounts[offer.id] || 0;
        let isRedeemed = false;

        const { description, category_recurrence } = parseOfferDescription(offer.description);
        const memberCatId = member.category_id;
        const settings = memberCatId ? category_recurrence[memberCatId] : null;

        if (settings) {
          if (settings.is_recurrent) {
            if (settings.hasUsageLimit && settings.usage_limit) {
              isRedeemed = count >= parseInt(settings.usage_limit);
            } else {
              isRedeemed = false; // Unlimited
            }
          } else {
            isRedeemed = count >= 1; // Single use
          }
        } else {
          if (offer.is_recurrent) {
            if (offer.usage_limit !== null && offer.usage_limit !== undefined) {
              isRedeemed = count >= offer.usage_limit;
            } else {
              isRedeemed = false; // Unlimited
            }
          } else {
            isRedeemed = count >= 1; // Default to single use
          }
        }

        return {
          id: offer.id,
          name: offer.name,
          description: description,
          is_redeemed: isRedeemed,
          min_bill_value: offer.min_bill_value,
          max_discount_amount: offer.max_discount_amount
        };
      });
    } catch (error) {
      console.error('Error fetching available offers:', error);
      throw error;
    }
  },

  async redeemOffer(redemption: Omit<OfferRedemption, 'id' | 'redeemed_at'>): Promise<OfferRedemption> {
    try {
      const { data, error } = await supabase
        .from('offer_redemptions')
        .insert([redemption])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error redeeming offer:', error);
      throw error;
    }
  },

  async getRedemptions(): Promise<OfferRedemption[]> {
    try {
      const { data, error } = await supabase
        .from('offer_redemptions')
        .select(`
          *,
          offers (
            name
          )
        `)
        .order('redeemed_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((redemption: any) => ({
        ...redemption,
        offer_name: redemption.offers?.name
      }));
    } catch (error) {
      console.error('Error fetching redemptions:', error);
      throw error;
    }
  },

  async getOffersByCategory(categoryId: number): Promise<PhysicalOffer[]> {
    try {
      const { data, error } = await supabase
        .from('offer_categories')
        .select(`
          offers (*)
        `)
        .eq('category_id', categoryId);

      if (error) throw error;
      
      return (data || [])
        .map((item: any) => item.offers)
        .filter(Boolean)
        .filter((offer: any) => offer.is_active)
        .map((offer: any) => {
          const { description, category_recurrence } = parseOfferDescription(offer.description);
          return {
            ...offer,
            description,
            category_recurrence
          };
        });
    } catch (error) {
      console.error('Error fetching offers by category:', error);
      throw error;
    }
  },

  async getOfferCategories(offerId: string): Promise<number[]> {
    try {
      const { data, error } = await supabase
        .from('offer_categories')
        .select('category_id')
        .eq('offer_id', offerId);

      if (error) throw error;
      return (data || []).map(item => item.category_id);
    } catch (error) {
      console.error('Error fetching offer categories:', error);
      throw error;
    }
  },

  async reactivateOffer(redemptionId: string, reactivatedBy: string = 'Admin User'): Promise<void> {
    try {
      // Cancel the redemption by setting status to 'cancelled' and track reactivation info
      const { error } = await supabase
        .from('offer_redemptions')
        .update({ 
          status: 'cancelled',
          reactivated_at: new Date().toISOString(),
          reactivated_by: reactivatedBy
        })
        .eq('id', redemptionId)
        .eq('status', 'active'); // Only update if currently active

      if (error) throw error;
    } catch (error) {
      console.error('Error reactivating offer:', error);
      throw error;
    }
  },

  async getActiveRedemptions(phone: string, offerId: string): Promise<any[]> {
    try {
      const phoneValidation = validateAndNormalizeSriLankanMobile(phone);
      const normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : phone;
      
      const searchFormats = [
        normalizedPhone,
        `+${normalizedPhone}`,
        phone
      ];

      const { data, error } = await supabase
        .from('offer_redemptions')
        .select('*')
        .in('customer_phone', searchFormats)
        .eq('offer_id', offerId)
        .eq('status', 'active')
        .order('redeemed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active redemptions:', error);
      throw error;
    }
  },

  async deleteOffer(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting offer:', error);
      throw error;
    }
  },
};
