import { auditApi } from '@/services/auditApi';

interface AuditLogParams {
  activityType: string;
  entityType: 'member' | 'company' | 'offer' | 'category' | 'redemption' | 'user';
  entityId?: string;
  entityName?: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'redeem' | 'login' | 'logout';
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
  performedBy,
  memberInfo,
  section,
  changes
}: AuditLogParams) => {
  try {
    let finalPerformedBy = performedBy;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        const roleSuffix = userObj.role === 'superadmin' ? 'Super Admin' : (userObj.role_name || userObj.role || '');
        const suffixStr = roleSuffix ? ` (${roleSuffix})` : '';

        if (!finalPerformedBy) {
          finalPerformedBy = userObj.username ? `${userObj.username}${suffixStr}` : 'Admin User';
        } else if (userObj.username && finalPerformedBy === userObj.username) {
          finalPerformedBy = `${userObj.username}${suffixStr}`;
        }
      }
    } catch {
      // ignore
    }

    if (!finalPerformedBy) {
      finalPerformedBy = 'Admin User';
    }

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

    await auditApi.logActivity({
      activity_type: activityType,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      action,
      details: enrichedDetails,
      performed_by: finalPerformedBy,
      ip_address: null,
      user_agent: navigator.userAgent
    });
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
