import { apiManager } from '@/app/apiManager';
import { buildListQuery, ListParams, PaginatedResponse } from './pagination';

export interface AuditLog {
  id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  action: string;
  details: any;
  performed_by: string | null;
  performed_at: string;
}

export interface PhoneView {
  id: string;
  member_id: string;
  viewed_at: string;
  viewer_info: string;
  members: {
    first_name: string;
    last_name: string;
    mobile: string;
    member_code: string;
  };
}

export const auditApi = {
  async getAuditLogs(params: ListParams = {}): Promise<AuditLog[]> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    return apiManager.get<AuditLog[]>(`/audit/logs?${queryParams.toString()}`);
  },

  async getAuditLogsPaginated(params: ListParams): Promise<PaginatedResponse<AuditLog>> {
    return apiManager.get<PaginatedResponse<AuditLog>>(`/audit/logs${buildListQuery(params)}`);
  },

  async getPhoneViews(params: ListParams = {}): Promise<PhoneView[]> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    return apiManager.get<PhoneView[]>(`/audit/phone-views?${queryParams.toString()}`);
  },

  async getPhoneViewsPaginated(params: ListParams): Promise<PaginatedResponse<PhoneView>> {
    return apiManager.get<PaginatedResponse<PhoneView>>(`/audit/phone-views${buildListQuery(params)}`);
  },

  async logPhoneView(memberId: string, viewerInfo: string = 'Admin User'): Promise<void> {
    return apiManager.post<void>('/audit/phone-views', {
      member_id: memberId,
      viewer_info: viewerInfo,
    });
  },

  async logActivity(data: any): Promise<void> {
    return apiManager.post<void>('/audit/logs', data);
  },
};
