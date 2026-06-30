import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthState } from '../types';

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  outlet_id?: string;
  outlet_code?: string;
  outlet_name?: string;
  outlet_address?: string;
  outlet_phone?: string;
  outlet_email?: string;
  outlet_manager?: string;
  outlet_company_id?: string;
  company_name?: string;
}

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7050/api';
      const response = await fetch(`${apiBase}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const userData = await response.json();

      // Transform the response to match our User interface
      const user: User = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        is_active: userData.is_active,
        outlet: userData.outlet_id ? {
          id: userData.outlet_id,
          outlet_code: userData.outlet_code,
          name: userData.outlet_name,
          address: userData.outlet_address,
          phone: userData.outlet_phone,
          email: userData.outlet_email,
          manager_name: userData.outlet_manager,
          company_id: userData.outlet_company_id,
          company_name: userData.company_name
        } : null
      };

      return user;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
