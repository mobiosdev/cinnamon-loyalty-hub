import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

// Staff and member sessions share one storage slot per browser. When another tab signs in as a
// different account (or signs out), reload so this tab doesn't keep acting as the old identity.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== 'user' && event.key !== null) return;
    let next: { id?: string; role?: string } | null = null;
    try {
      next = JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      next = null;
    }
    const current = store.getState().auth.user;
    if (String(next?.id ?? '') !== String(current?.id ?? '') || next?.role !== current?.role) {
      window.location.reload();
    }
  });
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
