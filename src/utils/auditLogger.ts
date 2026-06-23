import { supabase } from "@/integrations/supabase/client";

interface AuditLogParams {
  activityType: string;
  entityType: 'member' | 'company' | 'offer' | 'category' | 'redemption';
  entityId?: string;
  entityName?: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'redeem';
  details?: any;
  performedBy?: string;
  memberInfo?: {
    member_code?: string;
    phone?: string;
    name?: string;
  };
  section?: string;
  changes?: {
    field: string;
    before: any;
    after: any;
  }[];
}

export const logActivity = async ({
  activityType,
  entityType,
  entityId,
  entityName,
  action,
  details,
  performedBy = 'Admin User',
  memberInfo,
  section,
  changes
}: AuditLogParams) => {
  try {
    const enrichedDetails = {
      ...details,
      ...(memberInfo && {
        affected_member: memberInfo
      }),
      ...(section && {
        section
      }),
      ...(changes && changes.length > 0 && {
        changes
      })
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        activity_type: activityType,
        entity_type: entityType,
        entity_id: entityId || null,
        entity_name: entityName || null,
        action,
        details: enrichedDetails,
        performed_by: performedBy,
        ip_address: null, // Can be enhanced to capture actual IP
        user_agent: navigator.userAgent
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Helper functions for common activities
export const logMemberActivity = (
  action: 'create' | 'update' | 'delete', 
  memberName: string, 
  memberId?: string, 
  details?: any,
  memberInfo?: { member_code?: string; phone?: string; name?: string },
  section?: string,
  changes?: { field: string; before: any; after: any }[]
) => {
  return logActivity({
    activityType: 'member_management',
    entityType: 'member',
    entityId: memberId,
    entityName: memberName,
    action,
    details,
    memberInfo,
    section,
    changes
  });
};

export const logCompanyActivity = (action: 'create' | 'update' | 'delete', companyName: string, companyId?: string, details?: any) => {
  return logActivity({
    activityType: 'company_management',
    entityType: 'company',
    entityId: companyId,
    entityName: companyName,
    action,
    details
  });
};

export const logOfferActivity = (action: 'create' | 'update' | 'delete', offerName: string, offerId?: string, details?: any) => {
  return logActivity({
    activityType: 'offer_management',
    entityType: 'offer',
    entityId: offerId,
    entityName: offerName,
    action,
    details
  });
};

export const logCategoryActivity = (action: 'create' | 'update' | 'delete', categoryName: string, categoryId?: string, details?: any) => {
  return logActivity({
    activityType: 'category_management',
    entityType: 'category',
    entityId: categoryId,
    entityName: categoryName,
    action,
    details
  });
};

export const logRedemptionActivity = (memberName: string, offerId: string, details?: any) => {
  return logActivity({
    activityType: 'offer_redemption',
    entityType: 'redemption',
    entityId: offerId,
    entityName: memberName,
    action: 'redeem',
    details
  });
};
