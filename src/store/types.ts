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

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  outlet: Outlet | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
