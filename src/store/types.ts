export interface Outlet {
  id: string;
  outlet_code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  manager_name: string;
  company_id: string;
  company_name: string;
}

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

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  role_name?: string | null;
  mobile?: string;
  is_active: boolean;
  permissions: UserPermissions;
  outlet: Outlet | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // Two-step login state
  pendingUsername: string | null;
  maskedMobile: string | null;
  otpStep: boolean;
}

