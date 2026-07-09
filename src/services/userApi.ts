import { apiManager } from '@/app/apiManager';

export interface UserPermissions {
  registration: boolean;
  redemption: boolean;
  transactions: boolean;
  reports: boolean;
  settings_categories: boolean;
  settings_offers: boolean;
  settings_notifications: boolean;
  settings_audit: boolean;
  redemption_reversal: boolean;
}

export interface SystemRole {
  id: string;
  name: string;
  description?: string;
  permissions: UserPermissions;
  created_at: string;
  updated_at: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions: UserPermissions;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissions?: UserPermissions;
}

export interface SystemUser {
  id: string;
  username: string;
  email?: string;
  full_name: string;
  role: string;
  mobile?: string;
  is_active: boolean;
  role_id?: string;
  role_name?: string;
  permissions: UserPermissions;
  created_at: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  mobile?: string;
  role_id?: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
  mobile?: string;
  password?: string;
  is_active?: boolean;
  role_id?: string;
}

export const userApi = {
  // ==========================================
  // ROLES API
  // ==========================================
  async getRoles(): Promise<SystemRole[]> {
    return apiManager.get<SystemRole[]>('/system-users/roles');
  },

  async createRole(payload: CreateRolePayload): Promise<SystemRole> {
    return apiManager.post<SystemRole>('/system-users/roles', payload);
  },

  async updateRole(id: string, payload: UpdateRolePayload): Promise<SystemRole> {
    return apiManager.put<SystemRole>(`/system-users/roles/${id}`, payload);
  },

  async deleteRole(id: string): Promise<void> {
    return apiManager.delete<void>(`/system-users/roles/${id}`);
  },

  // ==========================================
  // USERS API
  // ==========================================
  async getUsers(): Promise<SystemUser[]> {
    return apiManager.get<SystemUser[]>('/system-users');
  },

  async createUser(payload: CreateUserPayload, createdById: string): Promise<SystemUser> {
    return apiManager.post<SystemUser>(`/system-users?created_by=${createdById}`, payload);
  },

  async updateUser(id: string, payload: UpdateUserPayload): Promise<SystemUser> {
    return apiManager.put<SystemUser>(`/system-users/${id}`, payload);
  },

  async deactivateUser(id: string): Promise<void> {
    return apiManager.delete<void>(`/system-users/${id}`);
  },
};
