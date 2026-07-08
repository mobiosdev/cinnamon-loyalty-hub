import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, AuthState } from '../types';

const API_BASE = () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:7050/api';

interface Step1Credentials {
  email: string;
  password: string;
}

interface Step1OtpResponse {
  otpRequired: true;
  masked_mobile: string;
  username: string; // needed for step2
}

interface Step1DirectResponse {
  otpRequired: false;
  user: User;
}

type Step1Response = Step1OtpResponse | Step1DirectResponse;

// Step 1: validate email+password → either fully logs in OR triggers OTP (superadmin)
export const loginStep1 = createAsyncThunk(
  'auth/loginStep1',
  async (credentials: Step1Credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE()}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Invalid email or password');
      }
      return (await response.json()) as Step1Response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  },
);

// Step 2: verify OTP → returns full user
export const loginStep2 = createAsyncThunk(
  'auth/loginStep2',
  async (credentials: Step2Credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE()}/users/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Invalid OTP');
      }
      const data = await response.json();
      const userData = data.user;
      const user: User = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        mobile: userData.mobile,
        is_active: userData.is_active,
        permissions: userData.permissions || {
          registration: false,
          redemption: false,
          transactions: false,
          reports: false,
          settings_categories: false,
          settings_offers: false,
          settings_notifications: false,
          settings_audit: false,
        },
        outlet: null,
      };

      // Store in localStorage for persistence
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(user));

      return user;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'OTP verification failed');
    }
  },
);

// Keep backward-compat loginUser alias (not used in new flow)
export const loginUser = loginStep1;

const savedUser = localStorage.getItem('user');
const savedToken = localStorage.getItem('token');

const initialState: AuthState = {
  user: savedUser ? JSON.parse(savedUser) : null,
  isAuthenticated: !!savedToken,
  isLoading: false,
  error: null,
  pendingUsername: null,
  maskedMobile: null,
  otpStep: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.pendingUsername = null;
      state.maskedMobile = null;
      state.otpStep = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearError: (state) => {
      state.error = null;
    },
    resetOtpStep: (state) => {
      state.otpStep = false;
      state.pendingUsername = null;
      state.maskedMobile = null;
    },
  },
  extraReducers: (builder) => {
    // Step 1
    builder
      .addCase(loginStep1.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginStep1.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as Step1Response;
        if (payload.otpRequired) {
          // Superadmin — show OTP step
          state.otpStep = true;
          state.maskedMobile = payload.masked_mobile;
          state.pendingUsername = payload.username;
        } else {
          // Regular user — directly authenticated
          state.user = payload.user;
          state.isAuthenticated = true;
          state.otpStep = false;
          // Store token in localStorage
          localStorage.setItem('token', payload.access_token);
          localStorage.setItem('user', JSON.stringify(payload.user));
        }
      })
      .addCase(loginStep1.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Step 2
    builder
      .addCase(loginStep2.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginStep2.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        state.pendingUsername = null;
        state.maskedMobile = null;
        state.otpStep = false;
      })
      .addCase(loginStep2.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError, resetOtpStep } = authSlice.actions;
export default authSlice.reducer;

